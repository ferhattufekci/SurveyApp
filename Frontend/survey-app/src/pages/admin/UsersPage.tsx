import { useEffect, useState } from 'react';
import { usersApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'User', isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const currentUser = useAuthStore(s => s.user);

  const load = () => usersApi.getAll().then(setUsers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ email: '', password: '', fullName: '', role: 'User', isActive: true });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditItem(u);
    setForm({ email: u.email, password: '', fullName: u.fullName, role: u.role, isActive: u.isActive });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) { setError('Ad Soyad zorunludur.'); return; }
    if (!editItem && !form.email.trim()) { setError('E-posta zorunludur.'); return; }
    if (!editItem && !form.password.trim()) { setError('Şifre zorunludur.'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await usersApi.update(editItem.id, { fullName: form.fullName, isActive: form.isActive });
      } else {
        await usersApi.create({ email: form.email, password: form.password, fullName: form.fullName, role: form.role, isActive: form.isActive });
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    // Kendi kendini silme engeli
    if (u.email === currentUser?.email) {
      alert('Kendi hesabınızı silemezsiniz.');
      return;
    }

    // Son aktif admin koruması
    const activeAdminCount = users.filter(x => x.role === 'Admin' && x.isActive).length;
    if (u.role === 'Admin' && activeAdminCount <= 1) {
      alert('Sistemde en az bir aktif admin bulunmalıdır. Son admin silinemez.');
      return;
    }

    const confirmMsg = u.role === 'Admin'
      ? `"${u.fullName}" bir Admin kullanıcısıdır. Silmek istediğinize emin misiniz?`
      : `"${u.fullName}" kullanıcısını silmek istediğinize emin misiniz?`;

    if (!confirm(confirmMsg)) return;

    try {
      await usersApi.delete(u.id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Silme işlemi başarısız.');
    }
  };

  // Tüm kullanıcılarda ara (aktif + pasif)
  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Kullanıcılar</h1><p>Sistem kullanıcılarını yönetin</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Kullanıcı</button>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <input className="search-input" placeholder="Kullanıcı ara..." value={search} onChange={e => setSearch(e.target.value)} />
          <span className="record-count">{filtered.length} kullanıcı</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Rol</th><th>Durum</th><th>Ad Soyad</th><th>E-posta</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isSelf = u.email === currentUser?.email;
                const isLastAdmin = u.role === 'Admin' && users.filter(x => x.role === 'Admin' && x.isActive).length <= 1;
                const canDelete = !isSelf && !isLastAdmin;

                return (
                  <tr key={u.id}>
                    <td><span className={`badge ${u.role === 'Admin' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-secondary'}`}>{u.isActive ? 'Aktif' : 'Pasif'}</span></td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-sm">{u.fullName[0]?.toUpperCase()}</div>
                        <strong>{u.fullName}{isSelf && <span className="text-muted" style={{fontWeight:'normal'}}> (siz)</span>}</strong>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>Düzenle</button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(u)}
                          disabled={!canDelete}
                          title={isSelf ? 'Kendi hesabınızı silemezsiniz' : isLastAdmin ? 'Son admin silinemez' : ''}
                          style={{ opacity: canDelete ? 1 : 0.4, cursor: canDelete ? 'pointer' : 'not-allowed' }}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">Kullanıcı bulunamadı.</div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>Ad Soyad</label>
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Ad Soyad" />
              </div>
              {!editItem && <>
                <div className="form-group">
                  <label>E-posta</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@ornek.com" />
                </div>
                <div className="form-group">
                  <label>Şifre</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </>}
              <div className="form-group">
                <label>Durum</label>
                <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
