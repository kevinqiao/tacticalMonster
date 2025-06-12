# 导航控制功能

## 概述

这个功能允许你在特定页面上阻止浏览器的前进和后退操作，包括：
- 浏览器的前进/后退按钮
- 键盘快捷键（Alt+左箭头/右箭头）
- 鼠标侧键导航
- 其他触发 `popstate` 事件的导航操作

## 使用方法

### 1. 导入 Hook

```typescript
import { useNavigationControl } from '../service/PageManager';
```

### 2. 在组件中使用

```typescript
const MyComponent: React.FC<PageProp> = ({ data, visible, close }) => {
  const { preventBackAndForward, allowBackAndForward } = useNavigationControl();

  // 当页面显示时阻止导航
  useEffect(() => {
    if (visible) {
      preventBackAndForward();
    }

    // 组件卸载时恢复导航
    return () => {
      allowBackAndForward();
    };
  }, [visible, preventBackAndForward, allowBackAndForward]);

  // 手动退出时要先恢复导航
  const handleExit = () => {
    allowBackAndForward();
    if (close) {
      close();
    }
  };

  return (
    <div>
      {/* 你的页面内容 */}
      <button onClick={handleExit}>退出</button>
    </div>
  );
};
```

### 3. API 说明

#### `useNavigationControl()`

返回一个对象，包含以下方法：

- `preventBackAndForward()`: 阻止浏览器的前进和后退操作
- `allowBackAndForward()`: 恢复浏览器的前进和后退操作

## 最佳实践

### 1. 确保正确清理

始终在组件卸载或页面退出时恢复导航：

```typescript
useEffect(() => {
  preventBackAndForward();
  
  return () => {
    allowBackAndForward(); // 重要：清理时恢复导航
  };
}, []);
```

### 2. 手动退出时恢复导航

在用户手动退出页面时，先恢复导航再退出：

```typescript
const handleExit = () => {
  allowBackAndForward(); // 先恢复导航
  close(); // 再退出页面
};
```

### 3. 条件性控制

只在需要的时候阻止导航：

```typescript
useEffect(() => {
  if (needPreventNavigation) {
    preventBackAndForward();
  } else {
    allowBackAndForward();
  }
}, [needPreventNavigation]);
```

## 实现原理

1. 通过 `preventNavigationRef` 和 `PageItem.preventNavigation` 属性来标记是否需要阻止导航
2. 当开启导航阻止时，使用 `history.replaceState` 在当前位置创建一个带有特殊状态标记的历史条目
3. 在 `popstate` 事件处理器中检查这些标志和状态标记
4. 如果需要阻止导航，使用 `history.replaceState` 将用户重新导航回当前页面
5. 使用 `replaceState` 而不是 `pushState`，避免在历史记录中累积无用的条目

### 优势

- **不污染历史记录**：使用 `replaceState` 避免了在历史记录中添加多余的条目
- **状态跟踪**：通过唯一的计数器来跟踪和验证导航阻止状态
- **可靠性**：能够有效阻止所有基于历史记录的导航操作

## 注意事项

1. **用户体验**: 谨慎使用此功能，过度限制用户导航可能影响用户体验
2. **清理**: 始终确保在适当的时候恢复导航功能
3. **兼容性**: 此功能基于 `popstate` 事件和 History API，在现代浏览器中都有良好支持
4. **测试**: 建议在不同浏览器和设备上测试导航阻止功能

## 应用场景

- 表单填写中途防止意外退出
- 游戏或考试页面
- 重要操作确认页面
- 引导流程中的关键步骤

## 示例

完整的示例代码请参考 `NavigationControlExample.tsx`。 