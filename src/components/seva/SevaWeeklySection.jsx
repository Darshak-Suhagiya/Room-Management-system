import { getWeeklyColumnCount } from '../../utils/sevaMutations'
import { SevaDropSlot } from './SevaDropSlot'

export function SevaWeeklySection({
  config,
  editable,
  onAssignSlot,
  onSelectPerson,
  onClearSlot,
  onEditTaskTitle,
  onAddTask,
  onRemoveTask,
  onAddColumn,
  onRemoveColumn,
}) {
  const { weeklyTasks, people } = config
  const colCount = getWeeklyColumnCount(config)

  return (
    <section className="seva-section seva-weekly-section">
      <div className="seva-section-head">
        <h3 className="seva-section-title">S5 - WEEKLY</h3>
        {editable && (
          <div className="seva-column-controls seva-no-print">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onRemoveColumn}
              disabled={colCount <= 1}
            >
              − Column
            </button>
            <span className="muted">{colCount} columns</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onAddColumn}
            >
              + Column
            </button>
          </div>
        )}
      </div>
      <table className="seva-table seva-weekly-table">
        <thead>
          <tr>
            <th>Task</th>
            {Array.from({ length: colCount }, (_, i) => (
              <th key={i}>Member {i + 1}</th>
            ))}
            {editable && <th className="seva-no-print" />}
          </tr>
        </thead>
        <tbody>
          {weeklyTasks.map((task) => {
            const ids = task.personIds ?? []
            return (
              <tr key={task.id}>
                <th className="seva-weekly-title">
                  {editable ? (
                    <input
                      type="text"
                      className="seva-weekly-title-input"
                      value={task.title}
                      onChange={(e) => onEditTaskTitle(task.id, e.target.value)}
                    />
                  ) : (
                    task.title
                  )}
                </th>
                {Array.from({ length: colCount }, (_, colIdx) => {
                  const personId = ids[colIdx] ?? null
                  const slot = { personId, note: '' }
                  return (
                    <SevaDropSlot
                      key={colIdx}
                      slot={slot}
                      people={people}
                      editable={editable}
                      dragPayload={{
                        personId,
                        note: '',
                        from: {
                          type: 'weekly',
                          taskId: task.id,
                          taskIndex: colIdx,
                        },
                      }}
                      onDropPerson={(payload) => {
                        const pid =
                          payload.personId ?? payload.from?.personId
                        onAssignSlot(task.id, colIdx, pid, payload.from)
                      }}
                      onSelectPerson={(personId) =>
                        onSelectPerson(task.id, colIdx, personId)
                      }
                      onClear={() => onClearSlot(task.id, colIdx)}
                      onEditNote={() => {}}
                    />
                  )
                })}
                {editable && (
                  <td className="seva-no-print">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onRemoveTask(task.id)}
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {editable && (
        <button
          type="button"
          className="btn btn-secondary btn-sm seva-no-print"
          onClick={onAddTask}
        >
          + Weekly task
        </button>
      )}
    </section>
  )
}
