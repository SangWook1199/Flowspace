import styles from "../../styles/App.module.css";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout({
  navigation,
  pages,
  members,
  children,
}) {
  return (
    <>
      <Sidebar
        navigation={navigation}
        pages={pages}
        members={members}
      />

      <main className={styles.main}>
        <Header />
        {children}
      </main>
    </>
  );
}