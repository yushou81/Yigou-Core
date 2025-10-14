// 文件: Canvas.tsx

import React, { useState, useRef, useEffect, useCallback, JSX } from 'react'
// 导入 Arrow 组件
import { Stage, Layer, Rect, Circle, Group, Arrow } from 'react-konva'
import { KonvaEventObject } from 'konva/lib/Node'
import { ShapeData, CameraState } from '../types/canvas' // Make sure this path is correct
import { Toolbar, ShapeType } from './Toolbar' // Make sure this path is correct

// --- 初始数据和常量 ---
const GRID_SIZE = 50
const MIN_SCALE = 0.1
const MAX_SCALE = 3
const SCALE_FACTOR = 1.1

const initialShapes: ShapeData[] = [
  { id: '1', type: 'rectangle', x: 100, y: 100, width: 150, height: 75, fill: '#3E92CC' },
  { id: '2', type: 'circle', x: 400, y: 200, width: 100, height: 100, fill: '#FF5A5F' }
]

// --- 辅助组件：GridBackground ---
interface GridBackgroundProps {
  scale: number
  offsetX: number
  offsetY: number
  stageWidth: number
  stageHeight: number
}

const GridBackground: React.FC<GridBackgroundProps> = React.memo(function GridBackground({
  scale,
  offsetX,
  offsetY,
  stageWidth,
  stageHeight
}) {
  const dots: JSX.Element[] = []
  const worldXStart = -offsetX / scale
  const worldYStart = -offsetY / scale
  const startX = worldXStart - (worldXStart % GRID_SIZE)
  const startY = worldYStart - (worldYStart % GRID_SIZE)

  // Using the dot color from your provided file
  const gridDotColor = '#959595'

  for (let i = startX; i < worldXStart + stageWidth / scale; i += GRID_SIZE) {
    for (let j = startY; j < worldYStart + stageHeight / scale; j += GRID_SIZE) {
      dots.push(
        <Circle
          key={`dot-${i}-${j}`}
          x={i}
          y={j}
          radius={1 / scale}
          fill={gridDotColor}
          listening={false}
        />
      )
    }
  }

  if (scale < 0.2) return null
  return <Group listening={false}>{dots}</Group>
})

declare global {
  interface Window {
    api: {
      saveData: (data: { shapes: ShapeData[], camera: CameraState }) => Promise<{ success: boolean, error?: string }>;
      loadData: () => Promise<{ shapes: ShapeData[], camera: CameraState } | null>;
    }
  }
}


// --- 防抖 (Debounce) 自訂 Hook ---
// 這是一個效能優化技巧。如果沒有它，每次滑鼠移動或縮放都會觸發一次檔案寫入，
// 這會造成大量的 I/O 操作，非常浪費效能。
// 防抖的作用是：當狀態連續改變時，它會等待，直到停止改變後的一小段時間 (例如 500ms) 才執行一次儲存操作。
function useDebouncedEffect(effect, deps, delay) {
  const callback = useCallback(effect, deps);

  useEffect(() => {
    const handler = setTimeout(() => {
      callback();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [callback, delay]);
}


// --- 核心组件：Canvas ---
// 怎么把该画布的坐标系弄出来，坐标系应该在刚进去没手动移动或缩放情况下的屏幕左上角.
// 下面的scale缩放数值是以原点为固定点缩放的（原点位置不变），偏移不是以原点为基准偏移（坐标系动，物体也跟着动，实际是原点位置动））
const Canvas: React.FC = () => {
  const [shapes, setShapes] = useState<ShapeData[]|null>(null)
  const [cameraState, setCameraState] = useState<CameraState>({ scale: 1, x: 0, y: 0 })
  const [stageSize, setStageSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  const [isPanning, setIsPanning] = useState(false)
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null)
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  // State for creating shapes
  const [selectedShapeType, setSelectedShapeType] = useState<ShapeType | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingShape, setDrawingShape] = useState<ShapeData | null>(null)

//------------------------------------------------------------------------------------------------
  useEffect(() => {
    const loadDataFromFile = async () => {
      // 呼叫我們在 preload.js 中定義的 API
      const data = await window.api.loadData();

      // 如果成功讀取到數據 (data 不是 null)
      if (data && data.shapes && data.camera) {
        // 如果檔案中有圖形數據，就用它來設定 state；如果沒有，則使用預設的 initialShapes。
        setShapes(data.shapes.length > 0 ? data.shapes : initialShapes);
        setCameraState(data.camera);
      } else {
        // 如果檔案不存在或內容為空，則使用預設的初始圖形數據。
        setShapes(initialShapes);
      }
    };

    loadDataFromFile();
  }, []);

  useDebouncedEffect(() => {
      // 如果 shapes 還是 null (表示仍在載入中)，則不執行儲存。
      if (shapes === null) {
        return;
      }

      // 準備好要儲存的數據物件
      const dataToSave = { shapes, camera: cameraState };
      // 呼叫我們在 preload.js 中定義的 API 來儲存數據
      window.api.saveData(dataToSave);
      console.log(dataToSave)
    },
    [shapes, cameraState], // 依賴陣列：只有當 shapes 或 cameraState 改變時，這個 effect 才會重新觸發。
    500 // 防抖延遲時間 (毫秒)，意味著在用戶停止操作 500ms 後才進行儲存。
  );


  // Keyboard and window resize listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsSpacePressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsSpacePressed(false)
        setIsPanning(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setStageSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Helper function to get pointer position in world coordinates
  const getPointerWorldPos = (stage: any) => {
    const pointer = stage.getPointerPosition()
    if (!pointer) return { x: 0, y: 0 }
    return {
      x: (pointer.x - cameraState.x) / cameraState.scale,
      y: (pointer.y - cameraState.y) / cameraState.scale
    }
  }

  // --- Event Handlers for Panning and Drawing ---

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const isPanningTriggered =
        isSpacePressed || (e.evt instanceof MouseEvent && e.evt.button === 1)
      if (isPanningTriggered) {
        setIsPanning(true)
        lastPointerPositionRef.current = e.target.getStage()!.getPointerPosition()
        return
      }

      if (selectedShapeType === 'arrow') {
        if (e.target !== e.target.getStage()) return

        setIsDrawing(true)
        const pos = getPointerWorldPos(e.target.getStage()!)
        const newShape: ShapeData = {
          id: 'drawing',
          type: selectedShapeType,
          points: [pos.x, pos.y, pos.x, pos.y],
          fill: '#000000',
          stroke: '#000000',
          strokeWidth: 4
        }
        setDrawingShape(newShape)
      }
    },
    [isSpacePressed, selectedShapeType, cameraState.x, cameraState.y, cameraState.scale]
  )

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isPanning && lastPointerPositionRef.current) {
        const stage = e.target.getStage()
        if (!stage) return
        const newPointerPosition = stage.getPointerPosition()
        if (!newPointerPosition) return

        const { x: lastX, y: lastY } = lastPointerPositionRef.current
        const dx = newPointerPosition.x - lastX
        const dy = newPointerPosition.y - lastY

        setCameraState((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy
        }))
        lastPointerPositionRef.current = newPointerPosition
        return
      }

      if (isDrawing && drawingShape) {
        const pos = getPointerWorldPos(e.target.getStage()!)
        const currentPoints = drawingShape.points!
        setDrawingShape({
          ...drawingShape,
          points: [currentPoints[0], currentPoints[1], pos.x, pos.y]
        })
      }
    },
    [isPanning, isDrawing, drawingShape, cameraState.x, cameraState.y, cameraState.scale]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    lastPointerPositionRef.current = null

    if (isDrawing && drawingShape) {
      setIsDrawing(false)
      if (
        drawingShape.points![0] !== drawingShape.points![2] ||
        drawingShape.points![1] !== drawingShape.points![3]
      ) {
        setShapes((prev) => [...prev, { ...drawingShape, id: Date.now().toString() }])
      }
      setDrawingShape(null)
      setSelectedShapeType(null)
    }
  }, [isDrawing, drawingShape])
  //创建形状图形
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.target !== e.target.getStage()) return

      if (selectedShapeType === 'rectangle' || selectedShapeType === 'circle') {
        const pos = getPointerWorldPos(e.target.getStage()!)
        const newShape: ShapeData = {
          id: Date.now().toString(),
          type: selectedShapeType,
          x: pos.x,
          y: pos.y,
          width: selectedShapeType === 'rectangle' ? 150 : 100,
          height: selectedShapeType === 'rectangle' ? 75 : 100,
          fill: `#${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0')}`
        }
        setShapes((prev) => [...prev, newShape])
        setSelectedShapeType(null)
      }
    },
    [selectedShapeType, cameraState.x, cameraState.y, cameraState.scale]
  )
  //滚轮缩放
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = e.target.getStage()
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      const direction = e.evt.deltaY > 0 ? 1 : -1
      const newScaleRaw =
        direction > 0 ? cameraState.scale / SCALE_FACTOR : cameraState.scale * SCALE_FACTOR
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScaleRaw))
      const mousePointTo = {
        x: (pointer.x - cameraState.x) / cameraState.scale,
        y: (pointer.y - cameraState.y) / cameraState.scale
      }
      const newX = pointer.x - mousePointTo.x * newScale
      const newY = pointer.y - mousePointTo.y * newScale
      setCameraState({ scale: newScale, x: newX, y: newY })
    },
    [cameraState.scale, cameraState.x, cameraState.y]
  )

  const handleShapeDragEnd = useCallback((e: KonvaEventObject<DragEvent>, id: string) => {
    const target = e.target
    setShapes((prev) =>
      prev.map((shape) => (shape.id === id ? { ...shape, x: target.x(), y: target.y() } : shape))
    )
  }, [])

  // --- Render Component for All Shape Types ---
  const RenderShape: React.FC<{ data: ShapeData }> = React.memo(function RenderShape({ data }) {
    switch (data.type) {
      case 'rectangle':
        return (
          <Rect
            x={data.x}
            y={data.y}
            width={data.width}
            height={data.height}
            fill={data.fill}
            shadowBlur={5}
            draggable={!isSpacePressed}
            onDragEnd={(e) => handleShapeDragEnd(e, data.id)}
          />
        )
      case 'circle':
        return (
          <Circle
            x={data.x}
            y={data.y}
            radius={(data.width || 100) / 2}
            fill={data.fill}
            shadowBlur={5}
            draggable={!isSpacePressed}
            onDragEnd={(e) => handleShapeDragEnd(e, data.id)}
          />
        )
      case 'arrow':
        return (
          <Arrow
            points={data.points || []}
            fill={data.stroke}
            stroke={data.stroke}
            strokeWidth={data.strokeWidth}
            listening={false}
          />
        )
      default:
        return null
    }
  })

  const getCursorStyle = () => {
    if (isSpacePressed) {
      return isPanning ? 'grabbing' : 'grab'
    }
    if (selectedShapeType) {
      return 'crosshair'
    }
    return 'default'
  }
  if (shapes === null) {
    return <div>正在載入畫布...</div>;
  }
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        cursor: getCursorStyle(),
        backgroundColor: 'white'
      }}
    >
      <Toolbar selectedShape={selectedShapeType} onSelectShape={setSelectedShapeType} />

      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleStageClick}
      >
        <Layer
          x={cameraState.x}
          y={cameraState.y}
          scaleX={cameraState.scale}
          scaleY={cameraState.scale}
        >
          <GridBackground
            scale={cameraState.scale}
            offsetX={cameraState.x}
            offsetY={cameraState.y}
            stageWidth={stageSize.width}
            stageHeight={stageSize.height}
          />
          {shapes.map((shape) => (
            <RenderShape key={shape.id} data={shape} />
          ))}
          {drawingShape && <RenderShape data={drawingShape} />}
        </Layer>
      </Stage>
    </div>
  )
}

export default Canvas
