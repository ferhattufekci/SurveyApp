interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Ara...' }: SearchInputProps) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <span style={{
        position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)',
        color: '#9ca3af', fontSize: '15px', pointerEvents: 'none', lineHeight: 1,
        userSelect: 'none',
      }}>🔍</span>
      <input
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '8px 32px 8px 34px',
          border: '1.5px solid #d1d5db', borderRadius: '8px',
          fontSize: '16px', fontFamily: 'inherit', outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          background: '#fff',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.boxShadow = 'none';
        }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: '#e5e7eb', border: 'none', borderRadius: '50%',
            width: '18px', height: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', color: '#6b7280', lineHeight: 1, padding: 0,
          }}
          title="Aramayı temizle"
        >×</button>
      )}
    </div>
  );
}
