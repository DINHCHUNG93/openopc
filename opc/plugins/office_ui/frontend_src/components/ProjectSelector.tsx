import { useState, useCallback, useMemo } from 'react'
import type { Project } from '../types/kanban'
import { useI18n } from '../i18n'

function toProjectSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '')
}

interface ProjectSelectorProps {
  projects: Project[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: (id: string) => void
  onDelete?: (id: string) => void
}

export function ProjectSelector({ projects, activeId, onSelect, onCreate, onDelete }: ProjectSelectorProps) {
  const { t } = useI18n()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const newSlug = useMemo(() => toProjectSlug(newName), [newName])
  const nameInvalid = newName.trim().length > 0 && !newSlug

  const handleCreate = useCallback(() => {
    if (!newSlug) return
    onCreate(newSlug)
    setNewName('')
    setCreating(false)
  }, [newSlug, onCreate])

  const handleDelete = useCallback(() => {
    if (!confirmDelete || !onDelete) return
    onDelete(confirmDelete)
    setConfirmDelete(null)
  }, [confirmDelete, onDelete])

  return (
    <div className="project-selector" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select
        className="theme-select"
        value={activeId}
        onChange={e => onSelect(e.target.value)}
        title={t('project.switch')}
        aria-label={t('project.switch')}
      >
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {creating ? (
        <form
          onSubmit={e => { e.preventDefault(); handleCreate() }}
          style={{ display: 'flex', gap: 4 }}
        >
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <input
              autoFocus
              className="theme-select"
              value={newName}
              placeholder={t('project.placeholder')}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setCreating(false) }}
              aria-invalid={nameInvalid}
              title={nameInvalid ? t('project.nameInvalid') : undefined}
              style={{
                width: 120,
                ...(nameInvalid ? { borderColor: '#ef4444', outline: '1px solid #ef4444' } : {}),
              }}
            />
            {nameInvalid && (
              <span style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                fontSize: 10, lineHeight: 1.3, whiteSpace: 'nowrap',
                color: '#ef4444', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: 4,
                padding: '2px 6px', zIndex: 100,
              }}>
                {t('project.nameInvalid')}
              </span>
            )}
          </span>
          <button
            type="submit"
            className="pill-btn"
            disabled={!newSlug}
            style={{ fontSize: 11, padding: '2px 8px', opacity: newSlug ? 1 : 0.5 }}
          >+</button>
        </form>
      ) : (
        <button
          className="pill-btn"
          onClick={() => setCreating(true)}
          title={t('project.new')}
          style={{ fontSize: 11, padding: '2px 8px' }}
        >
          +
        </button>
      )}
      {onDelete && activeId !== 'default' && !confirmDelete && (
        <button
          className="pill-btn"
          onClick={() => setConfirmDelete(activeId)}
          title={t('project.delete')}
          style={{ fontSize: 11, padding: '2px 8px', color: '#ef4444' }}
        >
          {t('project.deleteButton')}
        </button>
      )}

      {confirmDelete && (
        <div className="project-delete-confirm" style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }}>
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: 12, padding: '24px 32px',
            border: '1px solid var(--border)', color: 'var(--text)',
            maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
              {t('project.confirmTitle', { name: confirmDelete })}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('project.confirmBody')}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                className="pill-btn"
                onClick={() => setConfirmDelete(null)}
                style={{ padding: '6px 18px', fontSize: 13 }}
              >
                {t('common.cancel')}
              </button>
              <button
                className="pill-btn"
                onClick={handleDelete}
                style={{ padding: '6px 18px', fontSize: 13, background: '#ef4444', color: '#fff' }}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
