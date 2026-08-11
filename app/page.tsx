import SkillTree from "../components/SkillTree";

export default function HomePage() {
  // SkillTree fills the viewport itself (h-screen w-screen), so no wrapper
  // padding/max-width here.
  return <SkillTree />;
}
