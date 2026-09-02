import { FileText, Image, CheckSquare, Plus } from "lucide-react";

export default function PageBlockSection({ blocks }) {
  const iconMap = {
    text: <FileText size={18} />,
    image: <Image size={18} />,
    checklist: <CheckSquare size={18} />,
  };

  return (
    <section className="page-block-section">
      <h2>페이지 블록</h2>

      <div className="page-block-grid">
        {blocks.map((block) => (
          <article key={block.id} className="page-block-card">
            <div className="page-block-header">
              {iconMap[block.type]}
              <span>{block.label}</span>
            </div>

            <h3>{block.title}</h3>

            {block.type === "text" && <p>{block.content}</p>}

            {block.type === "image" && (
              <div className="page-image-box">
                <FileText size={28} />
                <div>
                  <strong>{block.fileName}</strong>
                  <span>{block.fileSize}</span>
                </div>
              </div>
            )}

            {block.type === "checklist" && (
              <div className="page-checklist">
                {block.items.map((item) => (
                  <label key={item.id}>
                    <input type="checkbox" defaultChecked={item.checked} />
                    {item.text}
                  </label>
                ))}
              </div>
            )}
          </article>
        ))}

        <button className="add-block-card">
          <Plus size={28} />
          <span>블록 추가</span>
          <small>텍스트 · 이미지 · 체크리스트</small>
        </button>
      </div>
    </section>
  );
}
