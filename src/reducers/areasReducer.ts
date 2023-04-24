type AreaAction =
    | { type: "ADD_AREA"; payload: Area }
    | { type: "REMOVE_AREA"; payload: Area }
    | { type: "LOAD_AREAS"; payload: Area[] }
    | { type: "REMOVE_ALL"; payload: Area[] };


export function areasReducer(state: Area[], action: AreaAction) {
    switch (action.type) {
        case "ADD_AREA":
            return [...state, action.payload];
        case "REMOVE_AREA":
            return state.filter((area) => area.id !== action.payload.id);
        case "REMOVE_ALL":
            return [];
        default:
            return state;
    }
}