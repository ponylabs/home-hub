import { createTheme, Card, Button, ActionIcon, Modal, Drawer, TextInput, Textarea, Select } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'mint',
  primaryShade: 5,
  colors: {
    mint: ['#e5fff6', '#c7f9e8', '#9cebd2', '#76d9bb', '#57c9a6', '#47bb98', '#359f7f', '#258467', '#1c6b53', '#12513f'],
    dark: ['#e9eeec', '#c1c9c7', '#8e9b97', '#65736e', '#424e49', '#2c3833', '#202b26', '#18231f', '#121b18', '#0c1512'],
  },
  fontFamily: '"Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif',
  headings: { fontFamily: '"Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif', fontWeight: '600' },
  defaultRadius: 'md',
  radius: { xs: '6px', sm: '9px', md: '12px', lg: '18px', xl: '24px' },
  components: {
    Card: Card.extend({ defaultProps: { radius: 'lg', padding: 'lg' } }),
    Button: Button.extend({ defaultProps: { radius: 'md', size: 'sm', fw: 500 } }),
    ActionIcon: ActionIcon.extend({ defaultProps: { variant: 'subtle', size: 'lg', color: 'gray' } }),
    Modal: Modal.extend({ defaultProps: { centered: true, radius: 'lg', closeButtonProps: { 'aria-label': '关闭弹窗' }, overlayProps: { backgroundOpacity: 0.65, blur: 5 } } }),
    Drawer: Drawer.extend({ defaultProps: { closeButtonProps: { 'aria-label': '关闭详情' }, overlayProps: { backgroundOpacity: 0.65, blur: 5 } } }),
    TextInput: TextInput.extend({ defaultProps: { size: 'md' } }),
    Textarea: Textarea.extend({ defaultProps: { size: 'md' } }),
    Select: Select.extend({ defaultProps: { size: 'md' } }),
  },
});
