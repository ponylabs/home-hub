"""验证检查器确实拒绝错误，不以文案匹配冒充业务验证。"""
import importlib.util
import os
import tempfile
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('check_harness', Path(__file__).resolve().parents[1] / 'scripts/check_harness.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

# 只列模板随附的入口，不从派生项目的整个 skills 目录推断模板所有权。
# 新增、移除或更名模板自带 Skill 时，同步此清单及根路由。
BUNDLED_SKILLS = (
    'seek-agent-experience',
    'seek-code-review',
    'seek-create-upgrade-guide',
    'seek-doc',
    'seek-error-handling',
    'seek-find-simplifications',
    'seek-initialize',
    'seek-merging-stacked-prs',
    'seek-notes',
    'seek-pr-description',
    'seek-prose',
    'seek-record-browser-gif',
    'seek-responsive-ui',
    'seek-speed-up-perf',
    'seek-test-reliability',
    'seek-translate-docs',
    'seek-trim-cot-leakage',
    'seek-ui',
    'seek-verify',
)


def bundled_skill_errors(root):
    """模板入口完整性；其他 Skill 的通用格式仍由实际检查器验证。"""
    errors = []
    routing = (root / 'AGENTS.md').read_text(encoding='utf-8')
    for name in BUNDLED_SKILLS:
        skill = root / '.agents/skills' / name / 'SKILL.md'
        if not name.startswith('seek-'):
            errors.append(f'{name}: 模板自带名称必须以 seek- 开头')
        if not skill.is_file():
            errors.append(f'{name}: 缺少模板自带入口')
            continue
        parts = skill.read_text(encoding='utf-8').split('---', 2)
        if len(parts) < 3 or f'name: {name}' not in parts[1].splitlines():
            errors.append(f'{name}: name 与模板自带名称不一致')
        if name not in routing:
            errors.append(f'{name}: 缺少根路由')
    return errors


class BundledSkillNames(unittest.TestCase):
    """检查模板自带入口；不限制派生项目自建 Skill 的命名。"""

    def test_bundled_names_and_routes(self):
        root = Path(__file__).resolve().parents[1]
        self.assertEqual(bundled_skill_errors(root), [])

    def test_translation_remains_manual(self):
        root = Path(__file__).resolve().parents[1]
        skill = root / '.agents/skills/seek-translate-docs/SKILL.md'
        metadata = skill.read_text(encoding='utf-8').split('---', 2)[1]
        self.assertIn('disable-model-invocation: true', metadata.splitlines())
        self.assertIn('user-invocable: true', metadata.splitlines())


class BundledSkillScope(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'AGENTS.md').write_text('\n'.join(BUNDLED_SKILLS), encoding='utf-8')
        for name in BUNDLED_SKILLS:
            skill = self.root / '.agents/skills' / name / 'SKILL.md'
            skill.parent.mkdir(parents=True)
            skill.write_text(f'---\nname: {name}\ndescription: 模板入口。\n---\n', encoding='utf-8')

    def test_custom_skills_do_not_expand_bundled_scope(self):
        for name in ('import-quotes', 'seek-business-import'):
            skill = self.root / '.agents/skills' / name / 'SKILL.md'
            skill.parent.mkdir(exist_ok=True)
            skill.write_text(f'---\nname: {name}\ndescription: 导入业务数据。\n---\n', encoding='utf-8')
        self.assertEqual(bundled_skill_errors(self.root), [])

    def test_renamed_bundled_skill_is_not_silently_excluded(self):
        skills = self.root / '.agents/skills'
        (skills / 'seek-doc').rename(skills / 'project-doc')
        self.assertTrue(any('seek-doc' in error for error in bundled_skill_errors(self.root)))

    def test_missing_bundled_skill_is_rejected(self):
        (self.root / '.agents/skills/seek-doc/SKILL.md').unlink()
        self.assertTrue(any('seek-doc' in error for error in bundled_skill_errors(self.root)))

    def test_wrong_bundled_metadata_is_rejected(self):
        skill = self.root / '.agents/skills/seek-doc/SKILL.md'
        skill.write_text(skill.read_text(encoding='utf-8').replace('name: seek-doc', 'name: project-doc'), encoding='utf-8')
        self.assertTrue(any('seek-doc' in error for error in bundled_skill_errors(self.root)))

    def test_missing_bundled_route_is_rejected(self):
        routing = self.root / 'AGENTS.md'
        routing.write_text('\n'.join(line for line in routing.read_text(encoding='utf-8').splitlines() if 'seek-doc' not in line) + '\n', encoding='utf-8')
        self.assertTrue(any('seek-doc' in error for error in bundled_skill_errors(self.root)))


class HarnessChecks(unittest.TestCase):
    def setUp(self):
        # CI 的提交基准属于外层仓库，不能用于测试创建的临时仓库。
        environment = patch.dict(os.environ)
        environment.start()
        self.addCleanup(environment.stop)
        os.environ.pop('HARNESS_ARCHIVE_BASE_REF', None)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.write('AGENTS.md', '# 规则\n')
        self.write('README.md', '# 项目\n')
        for name in MODULE.REQUIRED_DOCUMENTS:
            if not (self.root / name).exists():
                self.write(name, '# 项目事实\n')

    def write(self, path, text):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding='utf-8')
        return target

    def note(self, lifecycle='implemented'):
        status = 'implemented' if lifecycle == 'archived' else lifecycle
        if status == 'rejected':
            status += ' — 方案不适合'
        content = f'# Agent Note: 测试决定\n\nStatus: {status}\n'
        if lifecycle == 'archived':
            content += 'Archived: 2026-11-05\n'
        content += '\n## 问题\n真实问题。\n'
        headings = ('决策', '考虑过的替代方案', '后果') if lifecycle in ('implemented', 'archived') else ('提案', '考虑过的替代方案', '验收条件', '风险')
        return content + ''.join(f'\n## {heading}\n说明。\n' for heading in headings)

    def init_git(self):
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('config', 'user.name', 'Test Fixture')
        self.git('add', '.')
        self.git('commit', '-qm', 'fixture baseline')

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.root, check=True, capture_output=True, text=True).stdout.strip()

    def seal(self):
        self.write('.agents/notes/archived/AGENTS.md', '# 冻结规则\n')
        self.assertEqual(MODULE.check(self.root, seal_archives=True), [])

    def test_minimal_project(self):
        self.assertEqual(MODULE.check(self.root), [])

    def test_missing_entry(self):
        (self.root / 'AGENTS.md').unlink()
        self.assertTrue(MODULE.check(self.root))

    def test_each_fixed_document_is_required(self):
        for name in MODULE.REQUIRED_DOCUMENTS:
            with self.subTest(name=name):
                path = self.root / name
                content = path.read_text(encoding='utf-8')
                path.unlink()
                self.assertTrue(any(name in error for error in MODULE.check(self.root)))
                self.write(name, content)

    def test_optional_documents_and_notes_need_not_exist(self):
        self.assertFalse((self.root / '.agents/notes').exists())
        self.assertFalse((self.root / 'docs/web-styling.md').exists())
        self.assertEqual(MODULE.check(self.root), [])

    def test_all_note_lifecycles_and_classes(self):
        self.init_git()
        for lifecycle in MODULE.NOTE_LIFECYCLES:
            for kind in MODULE.NOTE_CLASSES:
                self.write(f'.agents/notes/{lifecycle}/{kind}/2026-11-04-example.md', self.note(lifecycle))
        self.seal()
        self.assertEqual(MODULE.check(self.root), [])

    def test_notes_control_documents(self):
        for scope in ('', 'proposed/', 'implemented/', 'rejected/'):
            for name in ('README.md', 'AGENTS.md'):
                self.write(f'.agents/notes/{scope}{name}', '# 规则\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_invalid_note_paths_and_names(self):
        cases = (
            'INDEX.md',
            'draft/feature/2026-11-04-example.md',
            'implemented/refactor/2026-11-04-example.md',
            'implemented/feature/nested/2026-11-04-example.md',
            'implemented/2026-11-04-example.md',
            'implemented/feature/2026-02-30-example.md',
            'implemented/feature/2026-1-04-example.md',
            'implemented/feature/2026-11-04-Example.md',
            'implemented/feature/2026-11-04-two_words.md',
        )
        for name in cases:
            with self.subTest(name=name):
                path = self.write(f'.agents/notes/{name}', '# 决策\n')
                self.assertTrue(MODULE.check(self.root))
                path.unlink()

    def test_notes_move_and_inbound_links_follow_lifecycle(self):
        old = '.agents/notes/proposed/architecture/2026-11-04-boundary.md'
        new = '.agents/notes/implemented/architecture/2026-11-04-boundary.md'
        self.write(old, self.note('proposed'))
        self.write('README.md', f'[决策]({old})\n')
        self.assertEqual(MODULE.check(self.root), [])
        target = self.root / new
        target.parent.mkdir(parents=True, exist_ok=True)
        (self.root / old).rename(target)
        self.assertTrue(MODULE.check(self.root))
        self.write(new, self.note('implemented'))
        self.write('README.md', f'[决策]({new})\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_archive_preserves_historical_outbound_links(self):
        name = '.agents/notes/archived/architecture/2026-11-04-boundary.md'
        self.init_git()
        self.write(name, self.note('archived') + '[历史路径](removed.md)\n')
        self.seal()
        self.write('README.md', f'[历史决策]({name})\n')
        self.assertEqual(MODULE.check(self.root), [])
        (self.root / name).unlink()
        self.assertTrue(MODULE.check(self.root))

    def test_archive_instructions_still_check_links(self):
        self.write('.agents/notes/archived/AGENTS.md', '[错误](missing.md)\n')
        self.assertTrue(MODULE.check(self.root))

    def test_active_note_outbound_links_are_checked(self):
        self.write('.agents/notes/implemented/process/2026-11-04-checks.md', '[失效](missing.md)\n')
        self.assertTrue(MODULE.check(self.root))

    def test_note_format_invalid_variants(self):
        good = self.note()
        cases = (
            good.replace('# Agent Note: 测试决定', '# 决策'),
            good.replace('Status: implemented', 'Status: proposed'),
            good.replace('Status: implemented', 'Status: implemented (done)'),
            good.replace('## 问题', '## 背景'),
            good.replace('## 决策', '## 提案'),
            good.replace('## 考虑过的替代方案', '## 其他'),
            good + '\nStatus: implemented\n',
            good + '\n## 计划\n',
            good + '\n## Migration plan\n',
            good.replace('\n\nStatus:', '\nStatus:'),
        )
        for content in cases:
            with self.subTest(content=content):
                self.write('.agents/notes/implemented/process/2026-11-04-example.md', content)
                self.assertTrue(any('格式' in error for error in MODULE.check(self.root)))

    def test_note_format_fenced_examples_not_structure(self):
        self.write('.agents/notes/implemented/process/2026-11-04-example.md', self.note() + '\n````md\n```\nStatus: proposed\n## 提案\n````\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_required_heading_inside_fence_does_not_count(self):
        self.write('.agents/notes/implemented/process/2026-11-04-example.md', self.note().replace('## 后果', '```md\n## 后果\n```'))
        self.assertTrue(MODULE.check(self.root))

    def test_rejected_reason_required_and_proposal_preserved(self):
        path = '.agents/notes/rejected/process/2026-11-04-example.md'
        self.write(path, self.note('rejected'))
        self.assertEqual(MODULE.check(self.root), [])
        self.write(path, self.note('rejected').replace(' — 方案不适合', ''))
        self.assertTrue(MODULE.check(self.root))

    def test_legacy_note_roots_rejected_even_empty(self):
        for path in ('docs/rfc', 'docs/rfcs'):
            target = self.root / path
            target.mkdir()
            self.assertTrue(any('旧 Notes' in error for error in MODULE.check(self.root)))
            target.rmdir()

    def test_unknown_empty_note_directories_rejected(self):
        for path in ('draft', 'implemented/refactor', 'archived/refactor'):
            target = self.root / '.agents/notes' / path
            target.mkdir(parents=True)
            self.assertTrue(MODULE.check(self.root))
            target.rmdir()

    def prepare_archive(self):
        self.init_git()
        path = '.agents/notes/archived/process/2026-11-04-example.md'
        self.write(path, self.note('archived'))
        self.write('.agents/notes/archived/AGENTS.md', '# 冻结规则\n')
        return path

    def test_archive_must_be_sealed(self):
        self.prepare_archive()
        self.assertTrue(any('封存' in error for error in MODULE.check(self.root)))
        self.seal()
        self.assertEqual(MODULE.check(self.root), [])

    def test_seal_is_idempotent_and_appends_only(self):
        self.prepare_archive()
        self.seal()
        first = (self.root / MODULE.ARCHIVE_MANIFEST).read_bytes()
        self.seal()
        self.assertEqual((self.root / MODULE.ARCHIVE_MANIFEST).read_bytes(), first)
        self.write('.agents/notes/archived/process/2026-11-04-other.md', self.note('archived'))
        self.seal()
        values = MODULE.parse_manifest((self.root / MODULE.ARCHIVE_MANIFEST).read_text())
        self.assertEqual(len(values), 2)

    def test_archive_changes_and_deletions_rejected_even_in_write_mode(self):
        path = self.prepare_archive()
        self.seal()
        manifest = (self.root / MODULE.ARCHIVE_MANIFEST).read_bytes()
        self.write(path, self.note('archived') + '\n篡改\n')
        self.assertTrue(MODULE.check(self.root, seal_archives=True))
        self.assertEqual((self.root / MODULE.ARCHIVE_MANIFEST).read_bytes(), manifest)
        (self.root / path).unlink()
        self.assertTrue(MODULE.check(self.root, seal_archives=True))

    def test_committed_seal_cannot_be_replaced_with_matching_new_content(self):
        path = self.prepare_archive()
        self.seal()
        self.git('add', '.')
        self.git('commit', '-qm', 'seal')
        self.write(path, self.note('archived') + '\n篡改\n')
        data = (self.root / path).read_bytes()
        relative = 'process/2026-11-04-example.md'
        self.write(MODULE.ARCHIVE_MANIFEST, MODULE.json.dumps({'version': 1, 'files': {relative: 'sha256:' + MODULE.hashlib.sha256(data).hexdigest()}}))
        errors = MODULE.check(self.root, seal_archives=True)
        self.assertTrue(any('基准封存' in error for error in errors))

    def test_removing_entire_archive_cannot_erase_committed_seals(self):
        import shutil
        self.prepare_archive()
        self.seal()
        self.git('add', '.')
        self.git('commit', '-qm', 'seal')
        shutil.rmtree(self.root / '.agents/notes/archived')
        self.assertTrue(any('基准封存' in error for error in MODULE.check(self.root)))

    def test_archive_metadata_invalid_variants(self):
        path = self.prepare_archive()
        for old, new in (('implemented', 'proposed'), ('2026-11-05', '2026-02-30'), ('2026-11-05', '2026-11-03'), ('Archived:', 'Archive:')):
            self.write(path, self.note('archived').replace(old, new))
            self.assertTrue(MODULE.check(self.root, seal_archives=True))
            self.assertFalse((self.root / MODULE.ARCHIVE_MANIFEST).exists())

    def test_archive_keeps_historical_body_format(self):
        path = self.prepare_archive()
        self.write(path, '# 历史标题\n\nStatus: implemented\nArchived: 2026-11-05\n\n历史正文无现代章节。\n')
        self.seal()
        self.assertEqual(MODULE.check(self.root), [])

    def test_archive_invalid_manifest_schema(self):
        self.prepare_archive()
        for value in ('[]', '{"version": 1, "files": {}, "extra": true}', '{"version": true, "files": {}}', '{"version": 1, "files": {"x": "bad"}}', '{'):
            self.write(MODULE.ARCHIVE_MANIFEST, value)
            self.assertTrue(MODULE.check(self.root, seal_archives=True))
            self.assertEqual((self.root / MODULE.ARCHIVE_MANIFEST).read_text(), value)

    def test_nonempty_archive_requires_readable_git_baseline(self):
        self.write('.agents/notes/archived/process/2026-11-04-example.md', self.note('archived'))
        self.write('.agents/notes/archived/AGENTS.md', '# 规则\n')
        self.assertTrue(any('基准' in error for error in MODULE.check(self.root, seal_archives=True)))

    def test_ci_zero_before_is_explicit_empty_baseline(self):
        self.write('.agents/notes/archived/process/2026-11-04-example.md', self.note('archived'))
        self.write('.agents/notes/archived/AGENTS.md', '# 规则\n')
        self.assertEqual(MODULE.check(self.root, seal_archives=True, baseline_ref='0' * 40), [])
        self.assertTrue(MODULE.check(self.root, baseline_ref='does-not-exist'))
        with patch.dict(os.environ, {'HARNESS_ARCHIVE_BASE_REF': '0' * 40}):
            self.assertEqual(MODULE.check(self.root), [])
            self.assertTrue(MODULE.check(self.root, baseline_ref='does-not-exist'))

    def test_archive_parent_symlink_is_not_followed(self):
        with tempfile.TemporaryDirectory() as outside:
            path = self.root / '.agents'
            path.symlink_to(outside, target_is_directory=True)
            self.assertTrue(any('符号链接' in error for error in MODULE.check(self.root, seal_archives=True)))

    def test_seal_does_not_write_when_other_validation_fails(self):
        self.prepare_archive()
        self.write('README.md', '[坏链接](missing.md)\n')
        self.assertTrue(MODULE.check(self.root, seal_archives=True))
        self.assertFalse((self.root / MODULE.ARCHIVE_MANIFEST).exists())

    def test_notes_format_and_archive_cli_failures(self):
        self.prepare_archive()
        script = str(Path(MODULE.__file__))
        result = subprocess.run([sys.executable, script, '--root', str(self.root), '--seal-archives'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.write('.agents/notes/implemented/process/2026-11-04-invalid.md', '# invalid\n')
        result = subprocess.run([sys.executable, script, '--root', str(self.root)], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('格式', result.stdout)
        (self.root / '.agents/notes/implemented/process/2026-11-04-invalid.md').unlink()
        self.write('.agents/notes/archived/process/2026-11-04-example.md', self.note('archived') + '\nchanged\n')
        result = subprocess.run([sys.executable, script, '--root', str(self.root), '--seal-archives'], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('内容改变', result.stdout)

    def test_valid_skill(self):
        self.write('.agents/skills/example/SKILL.md', '---\nname: example\ndescription: 测试明确职责\n---\n# 示例\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_skill_invocation_metadata_booleans(self):
        path = '.agents/skills/example/SKILL.md'
        self.write(path, '---\nname: example\ndescription: 示例\ndisable-model-invocation: true\nuser-invocable: false\n---\n')
        self.assertEqual(MODULE.check(self.root), [])
        for value in ('"true"', 'yes', 'False', '1', ''):
            for key in ('disable-model-invocation', 'user-invocable'):
                self.write(path, f'---\nname: example\ndescription: 示例\n{key}: {value}\n---\n')
                self.assertTrue(any('布尔值' in error for error in MODULE.check(self.root)))

    def test_duplicate_skill_metadata_rejected(self):
        for key in ('name', 'description', 'user-invocable'):
            self.write('.agents/skills/example/SKILL.md', f'---\nname: example\ndescription: 示例\n{key}: true\n{key}: false\n---\n')
            self.assertTrue(any('重复' in error for error in MODULE.check(self.root)))

    def test_mismatched_skill(self):
        self.write('.agents/skills/example/SKILL.md', '---\nname: other\ndescription: 示例\n---\n')
        self.assertTrue(MODULE.check(self.root))

    def test_missing_description(self):
        self.write('.agents/skills/example/SKILL.md', '---\nname: example\n---\n')
        self.assertTrue(MODULE.check(self.root))

    def test_missing_frontmatter(self):
        self.write('.agents/skills/example/SKILL.md', '# 缺少元数据\n')
        self.assertTrue(MODULE.check(self.root))

    def test_broken_link(self):
        self.write('README.md', '[不存在](missing.md)\n')
        self.assertTrue(MODULE.check(self.root))

    def test_relative_link(self):
        self.write('docs/read.md', '[入口](../README.md)\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_encoded_path_and_anchor(self):
        self.write('说明.md', '# 说明\n')
        self.write('README.md', '[中文](%E8%AF%B4%E6%98%8E.md#标题)\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_external_and_anchor_ignored(self):
        self.write('README.md', '[外部](https://example.com/a) [锚点](#标题)\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_code_fence_ignored(self):
        self.write('README.md', '```md\n[例子](not-real.md)\n```\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_long_fence_contains_short_fence(self):
        self.write('README.md', '````md\n```\n[例子](missing.md)\n````\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_closing_fence_cannot_have_text(self):
        self.write('README.md', '```md\n```not-close\n[例子](missing.md)\n```\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_link_after_long_fence_is_checked(self):
        self.write('README.md', '````md\n```\n````\n[失效](missing.md)\n')
        self.assertTrue(MODULE.check(self.root))

    def test_parentheses_in_target(self):
        self.write('guide(v1).md', '# 指南\n')
        self.write('README.md', '[指南](guide(v1).md)\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_angle_target_with_spaces(self):
        self.write('my guide.md', '# 指南\n')
        self.write('README.md', '[指南](<my guide.md>)\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_inline_code_ignored(self):
        self.write('README.md', '`[例子](missing.md)` 与 ``[例子](also-missing.md)``\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_quoted_empty_description(self):
        self.write('.agents/skills/example/SKILL.md', '---\nname: example\ndescription: ""\n---\n')
        self.assertTrue(MODULE.check(self.root))

    def test_outside_link_rejected(self):
        self.write('README.md', '[越界](../outside.md)\n')
        self.assertTrue(MODULE.check(self.root))

    def test_moving_document_requires_inbound_link_update(self):
        self.write('docs/old.md', '# 当前说明\n')
        self.write('README.md', '[说明](docs/old.md)\n')
        self.assertEqual(MODULE.check(self.root), [])
        (self.root / 'docs/old.md').rename(self.root / 'docs/new.md')
        self.assertTrue(MODULE.check(self.root))
        self.write('README.md', '[说明](docs/new.md)\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_cli_failure_is_nonzero(self):
        self.write('README.md', '[缺失参考](missing.md)\n')
        result = subprocess.run(
            [sys.executable, str(Path(MODULE.__file__)), '--root', str(self.root)],
            text=True, capture_output=True, check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('missing.md', result.stdout + result.stderr)

    def test_structure_pass_does_not_validate_business_code(self):
        # 明确锁定覆盖边界：结构绿灯不能证明业务语义或可执行性。
        self.write('broken.py', 'this is not valid Python!\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_dependency_ignored(self):
        self.write('node_modules/a/README.md', '[错误](missing.md)\n')
        self.assertEqual(MODULE.check(self.root), [])

    def test_external_required_directory_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as other:
            outside = Path(other)
            for path in (self.root / 'docs').iterdir():
                self.write(path.relative_to(self.root).as_posix(), '# 当前文档\n')
                (outside / path.name).write_text('# 外部文档\n', encoding='utf-8')
                path.unlink()
            (self.root / 'docs').rmdir()
            (self.root / 'docs').symlink_to(outside, target_is_directory=True)
            errors = MODULE.check(self.root)
            self.assertTrue(any('目录符号链接' in error for error in errors))

    def test_internal_directory_symlink_rejected(self):
        (self.root / 'alias').symlink_to(self.root / 'docs', target_is_directory=True)
        self.assertTrue(any('目录符号链接' in error for error in MODULE.check(self.root)))

    def test_ignored_directory_symlink_allowed(self):
        with tempfile.TemporaryDirectory() as other:
            (self.root / 'node_modules').symlink_to(other, target_is_directory=True)
            self.assertEqual(MODULE.check(self.root), [])

    def test_dangling_archived_note_symlink_rejected(self):
        path = self.root / '.agents/notes/archived/process/2026-11-04-test.md'
        path.parent.mkdir(parents=True)
        path.symlink_to(self.root / 'missing.md')
        self.assertTrue(any('不是可达的普通文件' in error for error in MODULE.check(self.root)))

    def test_archived_note_directory_rejected(self):
        path = self.root / '.agents/notes/archived/process/2026-11-04-test.md'
        path.mkdir(parents=True)
        self.assertTrue(any('不是可达的普通文件' in error for error in MODULE.check(self.root)))

    def test_document_symlink_loop_reports_error(self):
        (self.root / 'loop.md').symlink_to('loop.md')
        self.assertTrue(any('无法解析文档路径' in error for error in MODULE.check(self.root)))

    def test_link_symlink_loop_reports_error(self):
        (self.root / 'loop').symlink_to('loop')
        self.write('README.md', '[循环](loop)\n')
        self.assertTrue(any('无法解析链接' in error for error in MODULE.check(self.root)))

    def test_external_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as other:
            target = Path(other) / 'external.md'
            target.write_text('不应读取', encoding='utf-8')
            (self.root / 'external.md').symlink_to(target)
            self.assertTrue(MODULE.check(self.root))

if __name__ == '__main__':
    unittest.main()
