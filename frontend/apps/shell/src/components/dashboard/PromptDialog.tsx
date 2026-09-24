import { useEffect, useState, type FormEvent } from "react"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@aledobe/ui"

interface Props {
  open: boolean
  title: string
  description?: string
  initial?: string
  confirm?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (value: string) => void | Promise<void>
}

export function PromptDialog({
  open,
  title,
  description,
  initial = "",
  confirm = "Save",
  onOpenChange,
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    if (open) setValue(initial)
  }, [open, initial])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    await onSubmit(value.trim())
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{confirm}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
