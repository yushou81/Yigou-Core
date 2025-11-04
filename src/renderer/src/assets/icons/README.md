# Icons 目录

此目录用于存放矢量图标文件（SVG）。

## 使用方法

### 方式一：直接导入 SVG 作为 React 组件（推荐）

```tsx
import { ReactComponent as HomeIcon } from '@/assets/icons/home.svg'

<HomeIcon />
```

### 方式二：作为图片导入

```tsx
import homeIcon from '@/assets/icons/home.svg'

<img src={homeIcon} alt="home" />
```

### 方式三：内联 SVG（适合小图标）

```tsx
import homeIconPath from '@/assets/icons/home.svg?raw'

<div dangerouslySetInnerHTML={{ __html: homeIconPath }} />
```

## 图标命名规范

建议使用小写字母和连字符，例如：
- `home.svg`
- `save.svg`
- `folder-open.svg`
- `play.svg`

