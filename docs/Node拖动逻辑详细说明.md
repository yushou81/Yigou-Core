# Node 拖动逻辑详细说明

## 概述

Node 的拖动涉及多个层次的处理：**Konva 的拖拽事件**、**React 组件的事件处理**、**Canvas 的全局状态管理**以及**箭头连接的同步更新**。整个流程包括拖动开始、拖动中、拖动结束三个阶段。

---

## 一、Node 组件层面的拖动处理

### 1.1 组件结构（Node.tsx）

```typescript
<Group
  x={data.x}
  y={data.y}
  draggable={!isDragging && !isResizing}
  onClick={handleClick}
  onDragMove={(e) => { /* ... */ }}
  onDragEnd={handleDragEnd}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
```

**关键点：**
- **`Group`**：Konva 的容器组件，用于组合多个图形元素（Rect、Text、Circle 等）
- **`x={data.x}` 和 `y={data.y}`**：节点的世界坐标，从全局状态 `ShapeData` 读取
- **`draggable={!isDragging && !isResizing}`**：只在非拖动状态且非调整大小状态时允许拖拽
- **位置属性**：`Group` 的 `x`/`y` 是相对于父容器（Layer）的偏移，这里直接使用世界坐标

### 1.2 拖动过程中的事件处理（Node.tsx 第 173-183 行）

```typescript
onDragMove={(e) => {
  if (isResizing) {
    try { (e as any).cancelBubble = true; } catch {}
    return;
  }
  try {
    const t: any = e.target;
    console.log('[Node] dragMove', { id: data.id, x: t?.x?.(), y: t?.y?.(), isResizing });
  } catch {}
  if (onDragMove) onDragMove(e, data.id);
}}
```

**执行流程：**
1. **检查调整大小状态**：如果正在调整大小（`isResizing = true`），阻止事件冒泡并直接返回
2. **获取当前位置**：通过 `e.target.x()` 和 `e.target.y()` 获取 Konva Group 的当前位置
3. **向上传递事件**：调用 `onDragMove(e, data.id)` 将事件传递给 Canvas 组件处理

**为什么使用 `e.target.x()` 而不是 `data.x`？**
- `e.target.x()` 是 Konva Group 的**实时位置**（拖动过程中不断变化）
- `data.x` 是全局状态中的**旧位置**（还未更新）
- 拖动过程中，Konva 自动更新 Group 的位置，但全局状态需要在事件中手动更新

### 1.3 拖动结束事件（Node.tsx 第 35-47 行）

```typescript
const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
  if (isResizing) {
    try { (e as any).cancelBubble = true; } catch {}
    return;
  }
  try {
    const target: any = e.target;
    console.log('[Node] dragEnd', { id: data.id, finalX: target?.x?.(), finalY: target?.y?.() });
  } catch {}
  if (onDragEnd) {
    onDragEnd(e, data.id);
  }
};
```

**执行流程：**
1. **检查调整大小状态**：如果正在调整大小，阻止事件冒泡
2. **获取最终位置**：通过 `e.target.x()` 和 `e.target.y()` 获取拖动结束后的最终位置
3. **向上传递事件**：调用 `onDragEnd(e, data.id)` 将事件传递给 Canvas 组件

---

## 二、Canvas 层面的拖动处理

### 2.1 拖动中的实时更新（Canvas.tsx 第 1112-1186 行）

```typescript
onDragMove={(e, nodeId) => {
  // 实时更新与该节点相连的箭头端点，保持连接在同一边同一比例位置
  const target = e.target; const nx = target.x(); const ny = target.y();
  const movedNode = { ...shape, x: nx, y: ny } as any;
  const connectedArrows = shapes.filter(s => s.type === 'arrow' && (
    (s as any).sourceNodeId === nodeId || (s as any).targetNodeId === nodeId ||
    (s as any).startNodeId === nodeId || (s as any).endNodeId === nodeId
  ));
  
  connectedArrows.forEach(arrow => {
    // 更新箭头端点位置...
  });
}}
```

**执行流程：**

#### 步骤 1：获取节点实时位置
```typescript
const target = e.target; const nx = target.x(); const ny = target.y();
```
- `target.x()` 和 `target.y()` 是 Konva Group 的**实时位置**（拖动过程中不断变化）
- 这比从 `shapes` 状态读取更准确，因为状态更新可能有延迟

#### 步骤 2：构建移动后的节点对象
```typescript
const movedNode = { ...shape, x: nx, y: ny } as any;
```
- 创建一个包含新位置的节点对象，用于计算箭头端点的新位置

#### 步骤 3：查找所有连接的箭头
```typescript
const connectedArrows = shapes.filter(s => s.type === 'arrow' && (
  (s as any).sourceNodeId === nodeId || (s as any).targetNodeId === nodeId ||
  (s as any).startNodeId === nodeId || (s as any).endNodeId === nodeId
));
```
- 查找所有连接到当前节点的箭头（通过 `sourceNodeId`、`targetNodeId`、`startNodeId`、`endNodeId` 匹配）

#### 步骤 4：更新箭头的起点（如果连接到当前节点）
```typescript
if ((arrow as any).sourceNodeId === nodeId || (arrow as any).startNodeId === nodeId) {
  if ((arrow as any).sourceAttach) {
    // 有 attach 信息，直接使用固定到连接点
    const a = (arrow as any).sourceAttach;
    const w = movedNode.width || 0;
    const h = movedNode.height || 0;
    if (a.side === 'top') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y; }
    if (a.side === 'bottom') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y + h; }
    if (a.side === 'left') { x1 = movedNode.x; y1 = movedNode.y + a.ratio * h; }
    if (a.side === 'right') { x1 = movedNode.x + w; y1 = movedNode.y + a.ratio * h; }
  } else {
    // 没有 attach 信息，计算并更新 attach 信息
    const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], 1000000);
    if (snap) {
      x1 = snap.x;
      y1 = snap.y;
      // 计算 attach 信息并保存
      const side = snap.type === 'top' ? 'top' : ...;
      const ratio = (side === 'top' || side === 'bottom')
        ? (snap.x - movedNode.x) / w
        : (snap.y - movedNode.y) / h;
      updateShape(arrow.id, { 
        sourceAttach: { side, ratio },
        points: [x1, y1, x2, y2]
      });
      return; // 已在上面更新，跳过后续处理
    }
  }
}
```

**Attach 信息说明：**
- **`side`**：连接点所在的边（'top'、'bottom'、'left'、'right'）
- **`ratio`**：连接点在边上的位置比例（0-1）
  - 对于上下边：`ratio = (x - node.x) / node.width`
  - 对于左右边：`ratio = (y - node.y) / node.height`

**计算示例：**
- 节点在 (100, 100)，宽 200，高 120
- 箭头连接到上边中点：(100 + 200/2, 100) = (200, 100)
- `side = 'top'`，`ratio = (200 - 100) / 200 = 0.5`

#### 步骤 5：更新箭头的终点（如果连接到当前节点）
- 逻辑与起点相同，使用 `targetAttach` 信息

#### 步骤 6：更新箭头位置
```typescript
updateShape(arrow.id, { points: [x1, y1, x2, y2] });
```
- 将计算好的新端点位置更新到全局状态

### 2.2 拖动结束后的处理（Canvas.tsx 第 1086-1111 行）

```typescript
onDragEnd={(e, nodeId) => {
  // 先执行原有的箭头同步与吸附逻辑
  handleShapeDragEnd(e, nodeId);
  
  // 再检查归属：如果落在某容器内则归属该容器，否则清空归属
  const target = e.target;
  const finalX = target.x();
  const finalY = target.y();
  const node = shapes.find(s => s.id === nodeId);
  if (!node) return;
  
  const nodeWidth = node.width || 0;
  const nodeHeight = node.height || 0;
  const nodeCenterX = finalX + nodeWidth / 2;
  const nodeCenterY = finalY + nodeHeight / 2;
  
  // 查找所有容器
  const containers = shapes.filter(s => s.type === 'container' && (s.width || 0) > 0 && (s.height || 0) > 0);
  const hit = containers.find(c => {
    const inX = nodeCenterX >= (c.x || 0) && nodeCenterX <= (c.x || 0) + (c.width || 0);
    const inY = nodeCenterY >= (c.y || 0) && nodeCenterY <= (c.y || 0) + (c.height || 0);
    return inX && inY;
  });
  
  const currentParent = (node as any).parentContainerId || null;
  const newParent = hit ? hit.id : null;
  if (currentParent !== newParent) {
    updateShape(nodeId, { parentContainerId: newParent });
  }
}}
```

**执行流程：**

#### 步骤 1：处理箭头同步
```typescript
handleShapeDragEnd(e, nodeId);
```
- 调用 `handleShapeDragEnd` 更新节点位置并同步所有连接的箭头

#### 步骤 2：计算节点中心点
```typescript
const finalX = target.x();
const finalY = target.y();
const nodeCenterX = finalX + nodeWidth / 2;
const nodeCenterY = finalY + nodeHeight / 2;
```
- 使用节点的最终位置和尺寸计算中心点
- **为什么使用 `e.target.x()` 而不是 `data.x`？**
  - `e.target.x()` 是 Konva Group 的**最终位置**（拖动结束时）
  - `data.x` 是全局状态中的**旧位置**（还未更新）
  - 因为 `updateShape` 是异步的，状态更新可能有延迟

#### 步骤 3：检查节点是否落在容器内
```typescript
const hit = containers.find(c => {
  const inX = nodeCenterX >= (c.x || 0) && nodeCenterX <= (c.x || 0) + (c.width || 0);
  const inY = nodeCenterY >= (c.y || 0) && nodeCenterY <= (c.y || 0) + (c.height || 0);
  return inX && inY;
});
```
- 遍历所有容器，检查节点中心点是否在容器边界内

#### 步骤 4：更新节点的容器归属
```typescript
const currentParent = (node as any).parentContainerId || null;
const newParent = hit ? hit.id : null;
if (currentParent !== newParent) {
  updateShape(nodeId, { parentContainerId: newParent });
}
```
- 如果节点从一个容器移动到另一个容器（或移出容器），更新 `parentContainerId`

### 2.3 handleShapeDragEnd 的详细处理（Canvas.tsx 第 442-569 行）

```typescript
const handleShapeDragEnd = useCallback((e: KonvaEventObject<DragEvent>, id: string) => {
  const target = e.target;
  const finalX = target.x();
  const finalY = target.y();

  const shape = shapes.find(s => s.id === id);
  if (!shape) return;

  if (shape.type !== 'arrow') {
    // 1) 更新节点位置
    updateShape(id, { x: finalX, y: finalY });

    // 2) 让所有与该节点相连的箭头端点跟随（保持吸附在边框上，优先使用 attach 信息）
    const movedNode = { ...shape, x: finalX, y: finalY } as any;
    const connectedArrows = shapes.filter(s => s.type === 'arrow' && (
      (s as any).sourceNodeId === id || (s as any).targetNodeId === id ||
      (s as any).startNodeId === id || (s as any).endNodeId === id
    ));
    
    connectedArrows.forEach(arrow => {
      // 更新箭头端点位置（与 onDragMove 逻辑相同）
    });

    // 3) 移动后的节点尝试"吸附"附近的游离箭头端点
    const SNAP_THRESHOLD_ATTACH = 15;
    const freeArrows = shapes.filter(s => s.type === 'arrow') as any[];
    freeArrows.forEach(arrow => {
      // 如果箭头端点未连接且距离节点边界 < 15px，自动吸附
      if (!arrow.sourceNodeId && !arrow.startNodeId) {
        const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], SNAP_THRESHOLD_ATTACH);
        if (snap) {
          // 更新箭头，建立连接关系
          updateShape(arrow.id, {
            points: [snap.x, snap.y, x2, y2],
            sourceNode: movedNode.title || 'Node',
            startNodeId: id,
            sourceNodeId: id,
            sourceAttach: { side, ratio },
          });
        }
      }
      // 同样的逻辑处理终点
    });
  }
}, [updateShape, shapes]);
```

**执行流程：**

#### 步骤 1：更新节点位置
```typescript
updateShape(id, { x: finalX, y: finalY });
```
- 将节点的最终位置更新到全局状态

#### 步骤 2：同步连接的箭头端点
- 遍历所有连接到当前节点的箭头
- 如果箭头有 `sourceAttach`/`targetAttach` 信息，使用 attach 信息计算新位置
- 如果没有 attach 信息，计算并更新 attach 信息

#### 步骤 3：自动吸附附近的游离箭头端点
```typescript
const SNAP_THRESHOLD_ATTACH = 15;
const freeArrows = shapes.filter(s => s.type === 'arrow') as any[];
freeArrows.forEach(arrow => {
  // 起点未连接，尝试吸附
  if (!arrow.sourceNodeId && !arrow.startNodeId) {
    const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], SNAP_THRESHOLD_ATTACH);
    if (snap) {
      // 建立连接关系
      updateShape(arrow.id, {
        points: [snap.x, snap.y, x2, y2],
        sourceNode: movedNode.title || 'Node',
        startNodeId: id,
        sourceNodeId: id,
        sourceAttach: { side, ratio },
      });
    }
  }
});
```
- 查找所有未连接到节点的箭头端点
- 如果端点距离节点边界 < 15px，自动吸附到节点并建立连接关系

---

## 三、坐标系说明

### 3.1 世界坐标 vs 屏幕坐标

**世界坐标（World Coordinates）：**
- Node 的 `data.x` 和 `data.y` 存储在世界坐标系中
- 这是"画布空间"的坐标，不受相机变换影响

**屏幕坐标（Screen Coordinates）：**
- Konva Group 的 `x()` 和 `y()` 在拖动时是相对于 Layer 的坐标
- Layer 应用了相机变换（`x={camera.x}`, `y={camera.y}`, `scaleX={camera.scale}`），但 Group 的坐标始终是世界坐标

**为什么拖动时 Group 的位置就是世界坐标？**
```typescript
<Layer
  x={camera.x}
  y={camera.y}
  scaleX={camera.scale}
  scaleY={camera.scale}
>
  <Group x={data.x} y={data.y}>
    {/* Node 内容 */}
  </Group>
</Layer>
```
- Group 的 `x`/`y` 是相对于 Layer 的偏移
- Layer 的 `x`/`y` 是相机偏移
- 屏幕上的位置 = `Layer.x + Group.x * Layer.scale`
- 但拖动时，Konva 直接操作 Group 的世界坐标，所以 `e.target.x()` 就是世界坐标

### 3.2 拖动过程中的坐标转换

**拖动开始：**
- Konva 自动处理，无需手动转换

**拖动中：**
- `e.target.x()` 和 `e.target.y()` 直接是世界坐标
- 直接用于更新箭头端点和容器归属检查

**拖动结束：**
- `e.target.x()` 和 `e.target.y()` 是最终的世界坐标
- 直接更新到全局状态：`updateShape(id, { x: finalX, y: finalY })`

---

## 四、关键设计点

### 4.1 为什么拖动中不更新节点位置？

**问题：** 为什么 `onDragMove` 只更新箭头位置，不更新节点位置？

**答案：**
1. **性能考虑**：拖动过程中频繁更新全局状态会导致大量重渲染
2. **Konva 自动处理**：Konva 的 `draggable` 会自动更新 Group 的位置，无需手动同步
3. **最终一致性**：在 `onDragEnd` 中一次性更新节点位置，确保最终状态正确

### 4.2 为什么拖动结束要检查容器归属？

**原因：**
- 拖动过程中，节点可能从一个容器移动到另一个容器（或移出容器）
- 需要在拖动结束时检查并更新 `parentContainerId`
- 这影响节点的视觉层级和容器拖动时的跟随行为

### 4.3 Attach 信息的作用

**为什么需要 attach 信息？**
- **固定连接点**：箭头端点始终固定在节点的同一位置（同一边的同一比例）
- **避免计算误差**：每次拖动都重新计算可能导致位置漂移
- **性能优化**：直接使用 attach 信息计算比每次都调用 `findNearestPointOnShapeEdge` 更高效

**attach 信息的计算：**
```typescript
// side: 'top' | 'bottom' | 'left' | 'right'
// ratio: 0-1 的比例值

// 对于上下边：ratio = (x - node.x) / node.width
// 对于左右边：ratio = (y - node.y) / node.height

// 还原位置：
// top/bottom: x = node.x + ratio * node.width, y = node.y (或 node.y + node.height)
// left/right: x = node.x (或 node.x + node.width), y = node.y + ratio * node.height
```

---

## 五、完整流程图

```
用户开始拖动 Node
    ↓
Konva Group 的 draggable 启用（isResizing = false）
    ↓
用户拖动鼠标
    ↓
Konva 自动更新 Group 的位置（视觉上移动）
    ↓
触发 onDragMove 事件
    ↓
Node 组件：检查 isResizing，如果不是则调用 onDragMove(e, data.id)
    ↓
Canvas 组件：onDragMove 处理
  1. 获取节点实时位置 (target.x(), target.y())
  2. 查找所有连接的箭头
  3. 更新箭头端点位置（使用 attach 信息或计算 attach 信息）
  4. 更新箭头到全局状态
    ↓
用户松开鼠标
    ↓
触发 onDragEnd 事件
    ↓
Node 组件：handleDragEnd 调用 onDragEnd(e, data.id)
    ↓
Canvas 组件：onDragEnd 处理
  1. 调用 handleShapeDragEnd：
     a. 更新节点位置到全局状态
     b. 同步所有连接的箭头端点
     c. 自动吸附附近的游离箭头端点（< 15px）
  2. 检查容器归属：
     a. 计算节点中心点
     b. 查找包含中心点的容器
     c. 更新 parentContainerId
    ↓
全局状态更新完成，所有组件重新渲染
    ↓
Node 位置更新，箭头端点同步，容器归属更新
```

---

## 六、代码位置参考

- **Node 组件拖动事件**：`Node.tsx` 第 168-187 行
- **Canvas onDragMove**：`Canvas.tsx` 第 1112-1186 行
- **Canvas onDragEnd**：`Canvas.tsx` 第 1086-1111 行
- **handleShapeDragEnd**：`Canvas.tsx` 第 442-569 行
- **Attach 信息计算**：`Canvas.tsx` 第 1126-1182 行

---

## 七、常见问题

### Q1: 为什么拖动时节点会"跳跃"？
**A:** 可能是因为：
1. 在 `onDragMove` 中错误地更新了节点位置，导致 Konva 的自动位置和手动更新的位置冲突
2. 相机变换计算错误
3. 容器拖动时的坐标计算错误

### Q2: 为什么箭头端点会"乱连"？
**A:** 可能是因为：
1. 缺少 attach 信息，每次都重新计算导致位置漂移
2. attach 信息计算错误（ratio 计算错误）
3. 节点尺寸变化时 attach 信息未更新

### Q3: 为什么拖动结束时节点位置不对？
**A:** 可能是因为：
1. 使用了 `data.x` 而不是 `e.target.x()` 来获取最终位置
2. `updateShape` 是异步的，状态更新有延迟
3. 容器拖动时的坐标计算错误

### Q4: 如何调试拖动问题？
**A:** 
1. 在 `onDragMove` 和 `onDragEnd` 中添加 console.log 查看坐标值
2. 检查 `e.target.x()` 和 `data.x` 是否一致
3. 检查 attach 信息的 side 和 ratio 是否正确
4. 检查箭头端点的计算结果是否正确

