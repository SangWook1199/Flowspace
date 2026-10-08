import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import SprintForm from "../components/sprint/SprintForm";
import { sprintColorToHex } from "../utils/color";

// 스프린트 정보(이름·목표·설명·색·기간) 수정 화면이에요. 새 스프린트 만들기와 같은 폼을 써요.
export default function SprintEdit() {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const { sprints = [], sprintDataLoading, updateSprint } = useOutletContext();

  const sprint = sprints.find((item) => String(item.id) === sprintId && !item.isBacklog) ?? null;

  if (sprintDataLoading) {
    return (
      <div className="sprintCreatePage">
        <p className="emptySprints" role="status">스프린트를 불러오는 중이에요…</p>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="sprintCreatePage">
        <div className="emptySprints" role="alert">
          <p>스프린트를 찾을 수 없어요</p>
          <button type="button" className="sprintDetail" onClick={() => navigate("/sprints")}>
            ‹ 스프린트 목록으로
          </button>
        </div>
      </div>
    );
  }

  const goDetail = () => navigate(`/sprints/${sprint.id}`);

  // 저장에 성공하면 상세 화면으로 돌아가요. 실패하면 예외가 SprintForm으로 가서 안내 문구가 떠요.
  const handleSubmit = async (payload) => {
    await updateSprint(sprint.id, payload);
    goDetail();
  };

  return (
    <div className="sprintCreatePage">
      <div className="breadcrumb">
        <button type="button" className="breadcrumbLink" onClick={() => navigate("/sprints")}>
          스프린트
        </button>
        <ChevronRight size={16} />
        <button type="button" className="breadcrumbLink" onClick={goDetail}>
          {sprint.name}
        </button>
        <ChevronRight size={16} />
        <b>수정</b>
      </div>
      <div className="sprintPageHeading">
        <div>
          <h1>스프린트 수정</h1>
          <p>이름, 목표, 설명, 색, 기간을 바꿀 수 있어요. 상태는 상세 화면에서 바꿔요.</p>
        </div>
        <button type="button" onClick={goDetail}>
          <ChevronLeft size={17} /> 스프린트로 돌아가기
        </button>
      </div>
      <SprintForm
        initial={{
          name: sprint.name,
          goal: sprint.goal,
          description: sprint.description,
          color: sprintColorToHex(sprint.colorCode),
          startDate: sprint.startDate,
          endDate: sprint.endDate,
        }}
        submitLabel="저장"
        onCancel={goDetail}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
