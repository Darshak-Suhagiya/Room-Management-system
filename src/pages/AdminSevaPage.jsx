import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { SevaPersonColorProvider } from '../contexts/SevaPersonColorContext'
import { SevaGroupDefinitions } from '../components/seva/SevaGroupDefinitions'
import { SevaDailySchedule } from '../components/seva/SevaDailySchedule'
import { SevaWeeklySection } from '../components/seva/SevaWeeklySection'
import { SevaLoadTable } from '../components/seva/SevaLoadTable'
import { SevaPeoplePanel } from '../components/seva/SevaPeoplePanel'
import { SevaPrefillPanel } from '../components/seva/SevaPrefillPanel'
import { useSevaRoom } from '../hooks/useSevaRoom'
import { listAllUsers } from '../services/userService'
import {
  addDailyGroup,
  addDailyColumn,
  addPerson,
  addWeeklyTask,
  addWeeklyColumn,
  assignDailySlot,
  assignWeeklySlot,
  clearDailySlot,
  clearWeeklySlot,
  editDailyGroup,
  editWeeklyTaskTitle,
  linkPersonUser,
  removeDailyGroup,
  removeDailyColumn,
  removePerson,
  removeWeeklyTask,
  removeWeeklyColumn,
  renamePerson,
  updateDailySlotNote,
} from '../utils/sevaMutations'

export function AdminSevaPage() {
  const { canManageSeva } = useAuth()
  const { config, loading, saving, dirty, error, patchDraft, save, discardChanges } =
    useSevaRoom()
  const [users, setUsers] = useState([])
  const [newGroupCode, setNewGroupCode] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    listAllUsers().then(setUsers).catch(() => setUsers([]))
  }, [])

  const handleSave = async () => {
    try {
      await save()
      setSaveMsg('Saved ✓')
      setTimeout(() => setSaveMsg(''), 2500)
    } catch {
      /* error in hook */
    }
  }

  if (loading || !config) {
    return <p className="page-loading">Loading…</p>
  }

  if (!canManageSeva) {
    return <p className="form-error">Admin or Room leader access required.</p>
  }

  return (
    <SevaPersonColorProvider people={config.people}>
    <div className="page admin-page seva-page">
      <header className="page-header seva-no-print">
        <div>
          <h2>Room seva</h2>
          <p>
            Make changes, then save. Drag names or click an empty cell to assign.
          </p>
        </div>
        <div className="seva-toolbar">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!dirty || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {dirty && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={saving}
              onClick={discardChanges}
            >
              Discard
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            Print (A4)
          </button>
          {dirty && <span className="seva-dirty-badge">Unsaved changes</span>}
          {saveMsg && <span className="seva-saved-msg">{saveMsg}</span>}
        </div>
      </header>

      {error && <p className="form-error seva-no-print">{error}</p>}

      <SevaPrefillPanel
        config={config}
        onRulesChange={(rules) =>
          patchDraft((c) => ({ ...c, prefillRules: rules }))
        }
        onPrefillResult={(nextConfig) => patchDraft(() => nextConfig)}
      />

      <div className="seva-print-sheet seva-print-one-page" id="seva-print-area">
        <h1 className="seva-title">{config.title}</h1>

        <SevaGroupDefinitions
            dailyGroups={config.dailyGroups}
            editable
            onEditGroup={(id, patch) =>
              patchDraft((c) => editDailyGroup(c, id, patch))
            }
            onRemoveGroup={(id) =>
              patchDraft((c) => removeDailyGroup(c, id))
            }
          />

          <div className="seva-no-print seva-add-group">
            <input
              type="text"
              placeholder="Group code (e.g. S6)"
              value={newGroupCode}
              onChange={(e) => setNewGroupCode(e.target.value)}
            />
            <input
              type="text"
              placeholder="Description"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (!newGroupCode.trim()) return
                patchDraft((c) =>
                  addDailyGroup(c, newGroupCode.trim(), newGroupDesc.trim()),
                )
                setNewGroupCode('')
                setNewGroupDesc('')
              }}
            >
              + Daily group
            </button>
          </div>

          <div className="seva-distribution-section">
            <SevaDailySchedule
              config={config}
              editable
              onAssignSlot={(dayId, groupId, idx, personId, note, from) =>
                patchDraft((c) =>
                  assignDailySlot(c, dayId, groupId, idx, personId, note, from),
                )
              }
              onSelectPerson={(dayId, groupId, idx, personId) =>
                patchDraft((c) =>
                  assignDailySlot(c, dayId, groupId, idx, personId, '', null),
                )
              }
              onClearSlot={(dayId, groupId, idx) =>
                patchDraft((c) => clearDailySlot(c, dayId, groupId, idx))
              }
              onEditSlotNote={(dayId, groupId, idx, note) =>
                patchDraft((c) =>
                  updateDailySlotNote(c, dayId, groupId, idx, note),
                )
              }
              onAddColumn={() => patchDraft((c) => addDailyColumn(c))}
              onRemoveColumn={() => patchDraft((c) => removeDailyColumn(c))}
            />

            <SevaWeeklySection
              config={config}
              editable
              onAssignSlot={(taskId, colIdx, personId, from) =>
                patchDraft((c) =>
                  assignWeeklySlot(c, taskId, colIdx, personId, from),
                )
              }
              onSelectPerson={(taskId, colIdx, personId) =>
                patchDraft((c) =>
                  assignWeeklySlot(c, taskId, colIdx, personId, null),
                )
              }
              onClearSlot={(taskId, colIdx) =>
                patchDraft((c) => clearWeeklySlot(c, taskId, colIdx))
              }
              onEditTaskTitle={(taskId, title) =>
                patchDraft((c) => editWeeklyTaskTitle(c, taskId, title))
              }
              onAddTask={() => patchDraft((c) => addWeeklyTask(c))}
              onRemoveTask={(taskId) =>
                patchDraft((c) => removeWeeklyTask(c, taskId))
              }
              onAddColumn={() => patchDraft((c) => addWeeklyColumn(c))}
              onRemoveColumn={() => patchDraft((c) => removeWeeklyColumn(c))}
            />
          </div>

        <SevaLoadTable config={config} />
      </div>

      <SevaPeoplePanel
        people={config.people}
        users={users}
        editable
        onAddPerson={() => {
          const name = window.prompt('Member name:')
          if (name?.trim()) patchDraft((c) => addPerson(c, name.trim()))
        }}
        onRemovePerson={(id) => patchDraft((c) => removePerson(c, id))}
        onLinkUser={(personId, userId) =>
          patchDraft((c) => linkPersonUser(c, personId, userId))
        }
        onRenamePerson={(personId, name) =>
          patchDraft((c) => renamePerson(c, personId, name))
        }
      />
    </div>
    </SevaPersonColorProvider>
  )
}
