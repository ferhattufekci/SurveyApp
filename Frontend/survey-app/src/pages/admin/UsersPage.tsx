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
    // Giriş yapan kullanıcı kendini silemez
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

  // Arama: ad soyad, e-posta ve durum (aktif/pasif) alanlarında
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const durum = u.isActive ? 'aktif' : 'pasif';
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      durum.includes(q)
    );
  });

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  const totalCount = users.length;
  const activeCount = users.filter(u => u.isActive).length;
  const passiveCount = users.filter(u => !u.isActive).length;
  const adminCount = users.filter(u => u.role === 'Admin').length;
  const userCount = users.filter(u => u.role === 'User').length;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Kullanıcılar</h1><p>Sistem kullanıcılarını yönetin</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Kullanıcı</button>
      </div>

      {/* İstatistik kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Toplam', value: totalCount, color: '#6366f1', bg: '#eef2ff', icon: '👥' },
          { label: 'Aktif', value: activeCount, color: '#10b981', bg: '#ecfdf5', icon: '✅' },
          { label: 'Pasif', value: passiveCount, color: '#6b7280', bg: '#f3f4f6', icon: '⏸️' },
          { label: 'Admin', value: adminCount, color: '#f59e0b', bg: '#fffbeb', icon: '👑' },
          { label: 'User', value: userCount, color: '#3b82f6', bg: '#eff6ff', icon: '👤' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: stat.bg, border: `1px solid ${stat.color}22`,
            borderRadius: '12px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-toolbar">
          <input className="search-input" placeholder="Ad, e-posta, rol veya durum ara..." value={search} onChange={e => setSearch(e.target.value)} />
          <span className="record-count">{filtered.length} sonuç</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Rol</th><th>Durum</th><th>Ad Soyad</th><th>E-posta</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td><span className={`badge ${u.role === 'Admin' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-secondary'}`}>{u.isActive ? 'Aktif' : 'Pasif'}</span></td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-sm">{u.fullName[0]?.toUpperCase()}</div>
                      <strong>{u.fullName}</strong>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>Düzenle</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
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
