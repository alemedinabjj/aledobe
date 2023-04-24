import React from "react"

type SelectionRectangleProps = {
  startPosition: { x: number; y: number }
  endPosition: { x: number; y: number }
  sizeInfo: string
}

const SelectionRectangle: React.FC<SelectionRectangleProps> = ({ startPosition, endPosition, sizeInfo }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: Math.min(startPosition.y, endPosition.y),
        left: Math.min(startPosition.x, endPosition.x),
        width: Math.abs(endPosition.x - startPosition.x),
        height: Math.abs(endPosition.y - startPosition.y),
        backgroundColor: "rgba(0,0,0,0.2)",
        border: "1px solid black",
      }}
    >
      {sizeInfo}
    </div>
  )
}

export default SelectionRectangle
