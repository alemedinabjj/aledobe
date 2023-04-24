import React, { useReducer, useContext } from "react"
import { areasReducer } from "../reducers/areasReducer.js"

interface IArea {
  id: number
  x: number
  y: number
  width: number
  height: number
}

const ContextAreas = React.createContext<{ areas: IArea[]; dispatch: React.Dispatch<any> }>({
  areas: [],
  dispatch: () => null,
})

export const AreasProvider = ({ children }: { children: React.ReactNode }) => {
  const [areas, dispatch] = useReducer(areasReducer, [], (initialState) => {
    const savedAreas = localStorage.getItem("areas")
    return savedAreas ? JSON.parse(savedAreas) : initialState
  })

  return (
    <ContextAreas.Provider
      value={{
        areas,
        dispatch,
      }}
    >
      {children}
    </ContextAreas.Provider>
  )
}

export function useAreas() {
  return useContext(ContextAreas)
}
