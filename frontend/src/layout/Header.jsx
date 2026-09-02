import * as Icons from "lucide-react";
import styles from "../styles/classes.js";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.search}>
        <Icons.Search />
        <span>프로젝트, 페이지, 태스크 검색...</span>
        <kbd>⌘ K</kbd>
      </div>
      <div className={styles.headerRight}>
        <button className={styles.bell}>
          <Icons.Bell />
          <i />
        </button>
        <div className={styles.profile}>
          <span>상</span>
          <b>상욱</b>
          <Icons.ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}
