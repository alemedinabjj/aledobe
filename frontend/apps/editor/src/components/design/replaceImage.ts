import { readFile } from "../../core/images"
import { edit } from "./common"

export function pickReplacementImage(ids: string[]) {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*"
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const src = await readFile(file)
    edit(ids, (n) => (n.src = src))
  }
  input.click()
}
