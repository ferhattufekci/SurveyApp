import SearchInput from '../../components/admin/SearchInput';
import { useEffect, useState } from 'react';
import { usersApi, surveysApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { User, SurveyListItem } from '../../types';

type FilterKey = 'all' | 'active' | 'passive' | 'admin' | 'admin_active' | 'admin_passive' | 'user' | 'user_active' | 'user_passive';
const PAGE_SIZE = 8;

/* ── Tooltip ── */
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)', whiteSpace: 'nowrap',
          background: '#1f2937', color: '#fff', fontSize: '12px',
          padding: '5px 10px', borderRadius: '6px', zIndex: 999,
          boxShadow: '0 2px 8px rgba(0,0,0,.25)', pointerEvents: 'none',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: '5px', borderStyle: 'solid',
            borderColor: '#1f2937 transparent transparent transparent',
          }} />
        </span>
      )}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers]     = useState<User[]>([]);
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState<User | null>(null);
  const [editRowNum, setEditRowNum] = useState(0);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'User', isActive: true });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [errorType, setErrorType] = useState<'passive_conflict' | 'general' | ''>('');
  const [errorDetail, setErrorDetail] = useState('');
  const [shake, setShake]     = useState(false);
  const [search, setSearch]   = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [page, setPage]       = useState(1);

  const currentUser = useAuthStore(s => s.user);

  const load = () =>
    Promise.all([usersApi.getAll(), surveysApi.getAll()])
      .then(([u, s]) => { setUsers(u); setSurveys(s); })
      .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const closeModal = () => { setShowModal(false); setError(''); setErrorType(''); setErrorDetail(''); };

  const openCreate = () => {
    setEditItem(null); setEditRowNum(0);
    setForm({ email: '', password: '', fullName: '', role: 'User', isActive: true });
    setError(''); setErrorType(''); setErrorDetail(''); setShowModal(true);
  };

  const openEdit = (u: User, rowNum: number) => {
    setEditItem(u); setEditRowNum(rowNum);
    setForm({ email: u.email, password: '', fullName: u.fullName, role: u.role, isActive: u.isActive });
    setError(''); setErrorType(''); setErrorDetail(''); setShowModal(true);
  };

  const handleSave = async () => {
    setError(''); setErrorType(''); setErrorDetail('');
    if (!form.fullName.trim()) { setError('Ad Soyad zorunludur.'); setErrorType('general'); return; }
    if (!editItem && !form.email.trim()) { setError('E-posta zorunludur.'); setErrorType('general'); return; }
    if (!editItem && !form.password.trim()) { setError('Şifre zorunludur.'); setErrorType('general'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await usersApi.update(editItem.id, { fullName: form.fullName, isActive: form.isActive });
      } else {
        await usersApi.create({ email: form.email, password: form.password, fullName: form.fullName, role: form.role, isActive: form.isActive });
      }
      closeModal(); load();
    } catch (e: any) {
      const msg: string = e.response?.data?.message || 'Bir hata oluştu.';
      const parts = msg.split('|');
      const isPassiveConflict = parts.length === 3 && msg.toLowerCase().includes('aktif ankete atanmıştır');
      setError(isPassiveConflict ? parts[0] : msg);
      setErrorType(isPassiveConflict ? 'passive_conflict' : 'general');
      if (isPassiveConflict) setErrorDetail(parts[2]);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally { setSaving(false); }
  };

  const handleDelete = async (u: User, rowNum: number) => {
    if (u.email === currentUser?.email) { alert('Kendi hesabınızı silemezsiniz.'); return; }
    const activeAdminCount = users.filter(x => x.role === 'Admin' && x.isActive).length;
    if (u.role === 'Admin' && activeAdminCount <= 1) {
      alert('Sistemde en az bir aktif admin bulunmalıdır. Son admin silinemez.');
      return;
    }
    const confirmMsg = `${rowNum} numaralı ${u.role === 'Admin' ? 'Admin' : ''} kullanıcıyı silmek istediğinize emin misiniz?`;
    if (!confirm(confirmMsg)) return;
    try {
      await usersApi.delete(u.id); load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Silme işlemi başarısız.');
    }
  };

  /* Kullanıcının ankette kullanılıp kullanılmadığını kontrol et */
  const getUserSurveyCount = (userId: number) =>
    surveys.filter(s => (s as any).assignedUserIds?.includes(userId) ?? false).length;

  /* Basit kontrol: SurveyListItem'da assignedUserIds yok, bu yüzden
     assignedUserCount > 0 olan surveys'den kullanıcı kontrolü için
     backend'e güveniyoruz. Sil butonu disable için başka bir sinyal yok,
     bu yüzden sil butonunu her zaman aktif bırakıp backend hatası veriyoruz.
     Ama UI'da surveysApi'dan gelen veride assignedUserIds varsa kullanalım. */

  const handleFilterClick = (key: FilterKey) => {
    setActiveFilter(prev => prev === key ? 'all' : key);
    setSearch(''); setPage(1);
  };

  /* ── İstatistikler ── */
  const totalCount   = users.length;
  const activeCount  = users.filter(u => u.isActive).length;
  const passiveCount = users.filter(u => !u.isActive).length;
  const adminTotal   = users.filter(u => u.role === 'Admin').length;
  const adminActive  = users.filter(u => u.role === 'Admin' && u.isActive).length;
  const adminPassive = users.filter(u => u.role === 'Admin' && !u.isActive).length;
  const userTotal    = users.filter(u => u.role === 'User').length;
  const userActive   = users.filter(u => u.role === 'User' && u.isActive).length;
  const userPassive  = users.filter(u => u.role === 'User' && !u.isActive).length;

  /* ── Filtreleme ── */
  const filtered = users.filter(u => {
    const passesFilter =
      activeFilter === 'all'           ? true :
      activeFilter === 'active'        ? u.isActive :
      activeFilter === 'passive'       ? !u.isActive :
      activeFilter === 'admin'         ? u.role === 'Admin' :
      activeFilter === 'admin_active'  ? u.role === 'Admin' && u.isActive :
      activeFilter === 'admin_passive' ? u.role === 'Admin' && !u.isActive :
      activeFilter === 'user'          ? u.role === 'User' :
      activeFilter === 'user_active'   ? u.role === 'User' && u.isActive :
      activeFilter === 'user_passive'  ? u.role === 'User' && !u.isActive : true;
    if (!passesFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const durum = u.isActive ? 'aktif' : 'pasif';
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      durum.includes(q)
    );
  });

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ── Stil yardımcıları ── */
  const pillStyle = (key: FilterKey, activeBg: string, activeColor: string, inactiveBg: string, inactiveColor: string) => ({
    flex: 1, background: activeFilter === key ? activeBg : inactiveBg,
    color: activeFilter === key ? activeColor : inactiveColor,
    borderRadius: '8px', padding: '6px 10px', textAlign: 'center' as const,
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    border: activeFilter === key ? `2px solid ${activeColor}` : '2px solid transparent',
    transition: 'all 0.15s', userSelect: 'none' as const,
  });

  const cardTitleStyle = (key: FilterKey, activeColor: string) => ({
    fontWeight: 700, fontSize: '15px', cursor: 'pointer',
    color: activeFilter === key ? activeColor : '#4b5563',
    background: activeFilter === key ? `${activeColor}18` : 'transparent',
    borderRadius: '6px', padding: '2px 8px',
    transition: 'all 0.15s', userSelect: 'none' as const,
    border: activeFilter === key ? `1.5px solid ${activeColor}44` : '1.5px solid transparent',
  });

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)}
          30%{transform:translateX(8px)} 45%{transform:translateX(-6px)}
          60%{transform:translateX(6px)} 75%{transform:translateX(-3px)} 90%{transform:translateX(3px)}
        }
        .modal-shake { animation: shake 0.6s ease; }
      `}</style>

      <div className="page-header">
        <div><h1>Kullanıcılar</h1><p>Sistem kullanıcılarını yönetin</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Kullanıcı</button>
      </div>

      {/* ── İstatistik kartları (3 + bilgilendirme) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>

        {/* Toplam */}
        <div style={{ background: '#eef2ff', border: '1px solid #6366f122', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>👥</span>
            <span style={cardTitleStyle('all', '#6366f1')} onClick={() => handleFilterClick('all')}>
              Toplam
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '26px', fontWeight: 700, color: '#6366f1' }}>{totalCount}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={pillStyle('active', '#15803d', '#fff', '#dcfce7', '#15803d')} onClick={() => handleFilterClick('active')}>✅ {activeCount} Aktif</span>
            <span style={pillStyle('passive', '#6b7280', '#fff', '#f3f4f6', '#6b7280')} onClick={() => handleFilterClick('passive')}>⏸ {passiveCount} Pasif</span>
          </div>
        </div>

        {/* Admin */}
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b22', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>👑</span>
            <span style={cardTitleStyle('admin', '#f59e0b')} onClick={() => handleFilterClick('admin')}>
              Admin
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '26px', fontWeight: 700, color: '#f59e0b' }}>{adminTotal}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={pillStyle('admin_active', '#15803d', '#fff', '#dcfce7', '#15803d')} onClick={() => handleFilterClick('admin_active')}>✅ {adminActive} Aktif</span>
            <span style={pillStyle('admin_passive', '#6b7280', '#fff', '#f3f4f6', '#6b7280')} onClick={() => handleFilterClick('admin_passive')}>⏸ {adminPassive} Pasif</span>
          </div>
        </div>

        {/* User */}
        <div style={{ background: '#eff6ff', border: '1px solid #3b82f622', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>👤</span>
            <span style={cardTitleStyle('user', '#3b82f6')} onClick={() => handleFilterClick('user')}>
              Kullanıcı
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '26px', fontWeight: 700, color: '#3b82f6' }}>{userTotal}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={pillStyle('user_active', '#15803d', '#fff', '#dcfce7', '#15803d')} onClick={() => handleFilterClick('user_active')}>✅ {userActive} Aktif</span>
            <span style={pillStyle('user_passive', '#6b7280', '#fff', '#f3f4f6', '#6b7280')} onClick={() => handleFilterClick('user_passive')}>⏸ {userPassive} Pasif</span>
          </div>
        </div>

        {/* Bilgilendirme */}
        <div style={{ background: '#f0fdf4', border: '1px solid #10b98122', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>💡</span>
          <div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Her kullanıcı</div>
            <div style={{ fontWeight: 600, color: '#374151', fontSize: '13px' }}>Ankete atanabilir</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Ankete atanan kullanıcılar silinemez</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <SearchInput
            value={search}
            placeholder="Ad, e-posta, rol veya durum ara..."
            onChange={v => { setSearch(v); setActiveFilter('all'); setPage(1); }}
          />
          {activeFilter !== 'all' && (
            <button className="btn btn-sm btn-outline" onClick={() => { setActiveFilter('all'); setPage(1); }}>
              Filtreyi Temizle ×
            </button>
          )}
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Rol</th><th>Durum</th><th>Ad Soyad</th><th>E-posta</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {paginated.map((u, i) => {
                const rowNum   = (safePage - 1) * PAGE_SIZE + i + 1;
                const isSelf   = u.email === currentUser?.email;
                const isLastAdmin = u.role === 'Admin' && users.filter(x => x.role === 'Admin' && x.isActive).length <= 1;

                const canDelete = !isSelf && !isLastAdmin;
                const deleteTip = isSelf
                  ? 'Kendi hesabınızı silemezsiniz'
                  : isLastAdmin
                    ? 'Son aktif admin silinemez'
                    : '';

                return (
                  <tr key={u.id}>
                    <td className="text-muted" style={{ fontWeight: 600 }}>{rowNum}</td>
                    <td><span className={`badge ${u.role === 'Admin' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-secondary'}`}>{u.isActive ? 'Aktif' : 'Pasif'}</span></td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-sm">{u.fullName[0]?.toUpperCase()}</div>
                        <strong>{u.fullName}</strong>
                        {isSelf && <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>(siz)</span>}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(u, rowNum)}>Düzenle</button>

                        {canDelete ? (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u, rowNum)}>Sil</button>
                        ) : (
                          <Tooltip text={deleteTip}>
                            <button className="btn btn-sm btn-danger" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>Sil</button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">Kullanıcı bulunamadı.</div>}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {filtered.length} kullanıcıdan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} gösteriliyor
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹ Önceki</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPage(p)} style={{ minWidth: '36px' }}>{p}</button>
              ))}
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Sonraki ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className={`modal${shake ? ' modal-shake' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? `#${editRowNum} Kullanıcıyı Düzenle` : 'Yeni Kullanıcı'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">

              {/* Hata banner */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  background: errorType === 'passive_conflict' ? '#fefce8' : '#fef2f2',
                  border: `1px solid ${errorType === 'passive_conflict' ? '#fde047' : '#fecaca'}`,
                  borderLeft: `4px solid ${errorType === 'passive_conflict' ? '#eab308' : '#ef4444'}`,
                  borderRadius: '8px', padding: '12px 14px', marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{errorType === 'passive_conflict' ? '🔒' : '❌'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px',
                      color: errorType === 'passive_conflict' ? '#854d0e' : '#dc2626' }}>
                      {errorType === 'passive_conflict' ? 'Pasife Alınamaz — Aktif Ankete Atanmış' : 'Hata'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>{error}</div>
                    {errorType === 'passive_conflict' && errorDetail && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{errorDetail}</div>
                    )}
                    {errorType === 'passive_conflict' && (
                      <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500, marginTop: '6px' }}>
                        💡 Bu anketleri önce güncelleyin veya pasife alın, ardından kullanıcıyı pasife alabilirsiniz.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Ad Soyad</label>
                <input value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Ad Soyad" />
              </div>

              {!editItem && (
                <>
                  <div className="form-group">
                    <label>E-posta</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="email@ornek.com" />
                  </div>
                  <div className="form-group">
                    <label>Şifre</label>
                    <input type="password" value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••" />
                  </div>
                  <div className="form-group">
                    <label>Rol</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Durum</label>
                <select value={form.isActive ? 'true' : 'false'}
                  onChange={e => {
                    setForm(f => ({ ...f, isActive: e.target.value === 'true' }));
                    if (errorType === 'passive_conflict') { setError(''); setErrorType(''); setErrorDetail(''); }
                  }}>
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>İptal</button>
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
