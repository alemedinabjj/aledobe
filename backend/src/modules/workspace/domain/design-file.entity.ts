import { Entity } from "../../../shared/domain/entity"
import { ValidationError } from "../../../shared/domain/errors"

export interface DesignFileProps {
  name: string
  projectId: string
  document: unknown | null
  thumbnail: string | null
  createdAt: Date
  updatedAt: Date
}

const MAX_THUMBNAIL = 600_000
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

const cleanName = (name: string) => {
  const value = name.trim()
  if (!value) throw new ValidationError("File name is required")
  if (value.length > 120) throw new ValidationError("File name must be at most 120 characters")
  return value
}

const assertDocument = (document: unknown) => {
  if (document === null) return
  const d = document as { pages?: unknown; nodes?: unknown }
  if (typeof d !== "object" || !Array.isArray(d.pages) || typeof d.nodes !== "object") {
    throw new ValidationError("Document must contain pages and nodes")
  }
  if (Buffer.byteLength(JSON.stringify(document)) > MAX_DOCUMENT_BYTES) {
    throw new ValidationError("Document is larger than 20MB")
  }
}

export class DesignFile extends Entity<DesignFileProps> {
  static create(input: { name: string; projectId: string; document?: unknown }, now = new Date()) {
    const document = input.document ?? null
    assertDocument(document)
    return new DesignFile(Entity.newId(), {
      name: cleanName(input.name),
      projectId: input.projectId,
      document,
      thumbnail: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(id: string, props: DesignFileProps) {
    return new DesignFile(id, props)
  }

  get name() {
    return this.props.name
  }
  get projectId() {
    return this.props.projectId
  }
  get document() {
    return this.props.document
  }
  get thumbnail() {
    return this.props.thumbnail
  }
  get createdAt() {
    return this.props.createdAt
  }
  get updatedAt() {
    return this.props.updatedAt
  }

  rename(name: string) {
    this.props.name = cleanName(name)
  }

  replaceDocument(document: unknown) {
    assertDocument(document)
    this.props.document = document
  }

  setThumbnail(thumbnail: string | null) {
    if (thumbnail && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(thumbnail))
      throw new ValidationError("Thumbnail must be an image data URL")
    if (thumbnail && thumbnail.length > MAX_THUMBNAIL) throw new ValidationError("Thumbnail is too large")
    this.props.thumbnail = thumbnail
  }

  duplicate(now = new Date()) {
    const copy = DesignFile.create(
      {
        name: `${this.props.name} (copy)`,
        projectId: this.props.projectId,
        document: structuredClone(this.props.document),
      },
      now,
    )
    copy.props.thumbnail = this.props.thumbnail
    return copy
  }

  toSnapshot() {
    return { id: this.id, ...this.props }
  }
}
