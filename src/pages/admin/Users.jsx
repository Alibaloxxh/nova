import { useEffect, useState } from 'react'
import {
  IconPencil, IconTrash, IconX, IconRotate2, IconLock, IconLockOpen, IconArrowLeft,
} from '@tabler/icons-react'
import { supabase, getUsers, setAdmin } from '../../lib/supabase'
import { formatPrice, shortId } from '../../lib/format'

const PAGE = 10

export default function Users({ currentId }) {
  const [users, setUsers] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const [joinedFrom, setJoinedFrom] = useState('')
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editingEmail, setEditingEmail] = useState(null)

  const load = async () => {
    setError(null)
    try {
      const { users, count } = await getUsers({ search, status, role, joinedFrom, range: [page * PAGE, page * PAGE + PAGE - 1] })
      setUsers(users)
      setCount(count)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [page, search, status, role, joinedFrom])

  const run = async (fn) => {
    setError(null)
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const showDetails = async (u) => {
    setSelected(u)
    setEditingEmail(null)
    setDetails(null)
    const { data, error } = await supabase
      .from('orders')
      .select('id, total, status, payment_status, payment_method, created_at, order_items(name, price, quantity)')
      .eq('email', u.email)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error) setDetails(data ?? [])
  }

  const apply = (fn) => run(async () => {
    await fn()
    setSelected(null)
    setDetails(null)
    load()
  })

  const totalPages = Math.max(1, Math.ceil(count / PAGE))
  const statusLabel = (u) => (u.deleted_at ? 'deleted' : u.status)

  return (
    <div style={{ paddingBottom: 40 }}>
      {error && <p className="alert alert-error">{error}</p>}

      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        <form onSubmit={(e) => { e.preventDefault(); setPage(0); setSearch(query.trim()) }}>
          <input className="input" style={{ width: 220 }} placeholder="Search by email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
        <select className="input" style={{ width: 'auto' }} aria-label="Filter by status" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value) }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </select>
        <select className="input" style={{ width: 'auto' }} aria-label="Filter by role" value={role} onChange={(e) => { setPage(0); setRole(e.target.value) }}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <label className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 13 }}>Joined after</span>
          <input className="input" style={{ width: 'auto' }} type="date" value={joinedFrom} onChange={(e) => { setPage(0); setJoinedFrom(e.target.value) }} />
        </label>
        <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>{count} user{count === 1 ? '' : 's'}</span>
      </div>

      <div className="card body-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => showDetails(u)}>
                  <td style={{ fontWeight: 500 }}>{u.email}</td>
                  <td>{u.is_admin ? 'Admin' : 'User'}</td>
                  <td>{statusLabel(u)}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); showDetails(u) }} aria-label={`View ${u.email}`}>›</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="muted">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="row spread" style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <span className="muted" style={{ fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="card body-card" style={{ marginTop: 16 }}>
          <div className="row spread wrap">
            <h3 style={{ margin: 0, fontSize: 17 }}>
              {selected.email}
              <span className="tag" style={{ marginLeft: 10 }}>{selected.is_admin ? 'Admin' : 'User'}</span>
              <span className="tag" style={{ marginLeft: 6 }}>{statusLabel(selected)}</span>
            </h3>
            <button className="muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSelected(null)}>
              <IconArrowLeft size={16} /> Back to list
            </button>
          </div>

          <p className="muted" style={{ fontSize: 13 }}>Joined {new Date(selected.created_at).toLocaleDateString()}</p>

          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={busy || selected.id === currentId} title={selected.id === currentId ? "You can't demote yourself" : undefined}
              onClick={() => run(async () => { await setAdmin(selected.id, !selected.is_admin); setSelected((s) => ({ ...s, is_admin: !s.is_admin })) }) }>
              {selected.is_admin ? 'Remove admin' : 'Make admin'}
            </button>
            {!selected.deleted_at && (
              <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={busy} onClick={() => apply(async () => {
                await supabase.from('profiles').update({ status: selected.status === 'suspended' ? 'active' : 'suspended' }).eq('id', selected.id)
              })}>
                {selected.status === 'suspended' ? <><IconLockOpen size={13} /> Activate</> : <><IconLock size={13} /> Suspend</>}
              </button>
            )}
            {selected.deleted_at ? (
              <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={busy} onClick={() => apply(async () => {
                await supabase.from('profiles').update({ deleted_at: null, status: 'active' }).eq('id', selected.id)
              })}>
                <IconRotate2 size={13} /> Restore
              </button>
            ) : (
              <button className="btn" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)' }} disabled={busy} onClick={() => {
                if (confirm(`Delete ${selected.email}? (soft delete — can be restored)`)) apply(async () => {
                  await supabase.from('profiles').update({ deleted_at: new Date().toISOString(), status: 'suspended' }).eq('id', selected.id)
                })
              }}>
                <IconTrash size={13} /> Delete
              </button>
            )}
            {editingEmail === selected.id ? (
              <div className="row" style={{ gap: 6 }}>
                <input className="input" style={{ width: 220, fontSize: 13, padding: '4px 8px' }} value={editingEmail === selected.id ? selected.email : ''} onChange={(e) => setSelected((s) => ({ ...s, email: e.target.value }))} />
                <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} disabled={busy} onClick={() => apply(async () => {
                  await supabase.from('profiles').update({ email: selected.email }).eq('id', selected.id)
                  setEditingEmail(null)
                })}>Save</button>
                <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setEditingEmail(null); showDetails(selected) }}><IconX size={13} /></button>
              </div>
            ) : (
              <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setEditingEmail(selected.id); setSelected((s) => ({ ...s, email: selected.email })) }}>
                <IconPencil size={13} /> Edit email
              </button>
            )}
          </div>

          <h4 style={{ fontSize: 15, margin: '24px 0 8px' }}>Order history ({details ? details.length : '…'})</h4>
          {details === null ? (
            <p className="muted" style={{ fontSize: 13 }}>Loading orders…</p>
          ) : details.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No orders.</p>
          ) : (
            details.map((o) => (
              <div key={o.id} className="receipt-items" style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <div className="row spread">
                  <strong style={{ fontSize: 14 }}>#{shortId(o.id)}</strong>
                  <span className="tag">{o.status}</span>
                  <span className="tag">{o.payment_status}</span>
                  <span className="muted" style={{ fontSize: 13 }}>{new Date(o.created_at).toLocaleDateString()}</span>
                  <strong style={{ fontSize: 14 }}>{formatPrice(o.total)}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}