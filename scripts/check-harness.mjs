import { spawnSync } from 'node:child_process';

const candidates = process.env.PYTHON ? [process.env.PYTHON] : ['python3', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python'];
const python = candidates.find((command) => spawnSync(command, ['-c', 'import sys; sys.exit(sys.version_info < (3, 10))'], { stdio: 'ignore' }).status === 0);
if (!python) {
  console.error('Harness 检查需要 Python 3.10+；安装后可用 PYTHON 指定解释器。');
  process.exit(1);
}
for (const args of [['scripts/check_harness.py'], ['-m', 'unittest', 'discover', '-s', 'tests', '-v']]) {
  const result = spawnSync(python, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
