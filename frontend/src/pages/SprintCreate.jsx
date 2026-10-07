import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import SprintForm from "../components/sprint/SprintForm";

export default function SprintCreate() {
  const navigate = useNavigate();
  const { createSprint } = useOutletContext();

  // 만들기에 성공하면 목록으로 돌아가요. 실패하면 예외가 SprintForm으로 가서 안내 문구가 떠요.
  const handleSubmit = async (payload) => {
    await createSprint(payload);
    navigate("/sprints");
  };

  return (
    <div className="sprintCreatePage">
      <div className="breadcrumb">
        <button type="button" className="breadcrumbLink" onClick={() => navigate("/sprints")}>
          스프린트
        </button>
        <ChevronRight size={16} />
        <b>새 스프린트 생성</b>
      </div>
      <div className="sprintPageHeading">
        <div>
          <h1>새 스프린트 생성</h1>
          <p>새로운 스프린트를 생성하고 팀의 목표를 설정해보세요.</p>
        </div>
        <button type="button" onClick={() => navigate("/sprints")}>
          <ChevronLeft size={17} /> 스프린트 목록으로
        </button>
      </div>
      <SprintForm onSubmit={handleSubmit} />
    </div>
  );
}
