import React from "react"
import { Area as IArea } from "../../interfaces/Area.ts"
// import { useAreas } from "../contexts/AreasContext.tsx"

interface AreaProps {
  area: IArea
  selectedArea: IArea | null
  handleClickArea: (id: number) => void
  sizeInfo: string
}

const Area: React.FC<AreaProps> = ({ area, selectedArea, handleClickArea, sizeInfo }) => {
  // const { dispatch } = useAreas()

  return (
    <>
      <div
        key={area.id}
        style={{
          position: "absolute",
          left: area.x,
          top: area.y,
          width: area.width,
          height: area.height,
          border: `2px solid ${selectedArea?.id === area.id ? "red" : "black"}`,
          zIndex: 999,
        }}
        onClick={() => handleClickArea(area.id)}
      ></div>
      {selectedArea && (
        <div
          style={{
            position: "fixed",
            top: selectedArea.y,
            left: selectedArea.x + selectedArea.width + 8,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            zIndex: 999,
            cursor: "pointer",
          }}
        >
          {sizeInfo}
        </div>
      )}
    </>
  )
}

export default Area
