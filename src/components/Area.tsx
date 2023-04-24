import React from 'react';
import {Area as IArea} from "../interfaces/Area.ts";

interface AreaProps {
    area: IArea;
    selectedArea: IArea | null;
    handleClickArea: (id: string) => void;
}

const Area: React.FC<AreaProps> = ({ area, selectedArea, handleClickArea, sizeInfo, isSelecting }) => {
    return (
       <>
           <div
               key={area.id}
               style={{
                   position: 'absolute',
                   left: area.x,
                   top: area.y,
                   width: area.width,
                   height: area.height,
                   border: `2px solid ${selectedArea?.id === area.id ? 'red' : 'black'}`,
                   zIndex: 999
               }}
               onClick={() => handleClickArea(area.id)}
           ></div>
           {selectedArea && (
               <div
                   style={{
                       position: 'fixed',
                       top: selectedArea.y,
                       left: selectedArea.x + selectedArea.width + 8,
                       backgroundColor: 'rgba(0, 0, 0, 0.8)',
                       color: 'white',
                       padding: '4px 8px',
                       borderRadius: '4px',
                       fontSize: '12px',
                       zIndex: 999,
                   }}
               >
                   {sizeInfo}
               </div>

           )}

           {isSelecting && (
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
           )}
       </>
    );
};

export default Area;
