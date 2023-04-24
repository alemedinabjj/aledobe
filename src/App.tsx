import React, { useState, useEffect, useRef } from "react"
import { Area as IArea } from "./interfaces/Area.ts"
import Area from "./components/Area.tsx"
import SelectionRectangle from "./components/SelectionRectangle.tsx"
import { useAreas } from "./contexts/AreasContext.tsx"

function App() {
  // const [areas, dispatch] = useReducer(areasReducer, [], (initialState) => {
  //   const savedAreas = localStorage.getItem("areas")
  //   return savedAreas ? JSON.parse(savedAreas) : initialState
  // })

  const { areas, dispatch } = useAreas()

  const containerRef = useRef<HTMLDivElement>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 })
  const [endPosition, setEndPosition] = useState({ x: 0, y: 0 })
  const [sizeInfo, setSizeInfo] = useState("")
  const [selectedArea, setSelectedArea] = useState<IArea | null>(null)

  const handleClickArea = (id: number) => {
    const area = areas.find((a) => a.id === id)
    if (selectedArea && selectedArea.id === area!.id) {
      setSelectedArea(null)
      setSizeInfo("")
    } else {
      setSelectedArea(area!)
      setSizeInfo(`${area!.width}x${area!.height}`)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSelecting(true)
    const x = e.clientX - containerRef.current!.offsetLeft
    const y = e.clientY - containerRef.current!.offsetTop
    setStartPosition({ x, y })
    setEndPosition({ x, y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting) {
      const x = e.clientX - containerRef.current!.offsetLeft
      const y = e.clientY - containerRef.current!.offsetTop
      setEndPosition({ x, y })
      const width = Math.abs(endPosition.x - startPosition.x)
      const height = Math.abs(endPosition.y - startPosition.y)
      setSizeInfo(`${width}x${height}`)
    }
  }

  const handleRemoveAll = () => {
    dispatch({ type: "REMOVE_ALL", payload: [] })
  }

  const handleMouseUp = () => {
    setIsSelecting(false)
    const newArea = {
      id: Date.now(),
      x: Math.min(startPosition.x, endPosition.x),
      y: Math.min(startPosition.y, endPosition.y),
      width: Math.abs(endPosition.x - startPosition.x),
      height: Math.abs(endPosition.y - startPosition.y),
    }
    dispatch({ type: "ADD_AREA", payload: newArea })
    setStartPosition({ x: 0, y: 0 })
    setEndPosition({ x: 0, y: 0 })
  }

  useEffect(() => {
    localStorage.setItem("areas", JSON.stringify(areas))
  }, [areas])

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100vh" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <button onClick={() => handleRemoveAll()} style={{ position: "absolute", top: "0px", left: "0px", zIndex: 999 }}>
        Remove All
      </button>
      {areas.map((area) => (
        <Area
          key={area.id}
          area={area}
          selectedArea={selectedArea}
          handleClickArea={handleClickArea}
          sizeInfo={sizeInfo}
        />
      ))}

      {isSelecting && (
        <SelectionRectangle startPosition={startPosition} endPosition={endPosition} sizeInfo={sizeInfo} />
      )}
    </div>
  )
}

export default App
