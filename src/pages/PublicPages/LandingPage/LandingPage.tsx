import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Gavel,
  Globe,
  Lock,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Avatar, Badge, Card, LinkButton } from "../../../components/ui";
import { ScrollReveal } from "../../../components/ui/ScrollReveal";
import { useSession } from "../../../context/sessionContext";
import { getPublicExperience } from "../../../lib/roleExperience";

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDqRp4QflFu-D-EIWMjnmYsbOjXRCdI4aDej1btMDToV9m43vKdHfxezJrNscBn_wTGgZ68l0pe_bwjwtTOa-bBsxSLO5Wn2yULNmTW55tm8Qc3FhuQKqgvLSYNIWzGEXnIhkICsECPzizVd1xtttbyCcysC0xqjUXz60YhmWz_nqv9tke8Gbk3joKQgpwtuogZ4NYoYf6DujYBglOeeGb4Z53KlBwPvjc1tcVT6yjGY9kzfokWXgoJYx24h92N_E4kL6u7cDQtOJLX";

const workflowSteps = [
  {
    title: "Đăng nhu cầu",
    description: "Mô tả dự án AI và yêu cầu kỹ năng cần thiết.",
  },
  {
    title: "Matching",
    description: "Hệ thống AI tự động đề xuất top chuyên gia phù hợp.",
  },
  {
    title: "Proposal",
    description: "Nhận và đánh giá các đề xuất chi tiết từ ứng viên.",
  },
  {
    title: "Hợp đồng & NDA",
    description: "Ký kết trực tuyến an toàn và bảo mật thông tin.",
  },
  {
    title: "Milestone & Thanh toán",
    description: "Nghiệm thu từng giai đoạn và giải ngân minh bạch.",
  },
] as const;

const trustHighlights = [
  {
    icon: ShieldCheck,
    title: "Bảo mật Escrow",
    description:
      "Ngân sách dự án được giữ an toàn bởi AITASKER và chỉ chuyển cho chuyên gia khi công việc được hoàn thành.",
  },
  {
    icon: Gavel,
    title: "Giải quyết tranh chấp",
    description:
      "Đội ngũ hỗ trợ chuyên nghiệp sẵn sàng can thiệp và hòa giải dựa trên bằng chứng công việc thực tế.",
  },
] as const;

const trustCards = [
  {
    icon: CheckCircle2,
    title: "Hồ sơ thật",
    description: "Xác minh danh tính và chứng chỉ chuyên môn.",
    offset: false,
  },
  {
    icon: FileCheck2,
    title: "Hợp đồng điện tử",
    description: "Giá trị pháp lý tương đương văn bản giấy.",
    offset: true,
  },
  {
    icon: Star,
    title: "Đánh giá thực",
    description: "Hệ thống feedback hai chiều sau mỗi dự án.",
    offset: false,
  },
  {
    icon: Lock,
    title: "NDA tự động",
    description: "Bảo vệ tài sản trí tuệ của doanh nghiệp.",
    offset: true,
  },
] as const;

const useCases = [
  {
    icon: MessageSquareText,
    title: "Chatbot nội bộ",
    description:
      "Xây dựng trợ lý ảo trả lời chính sách, tra cứu tài liệu nội bộ dựa trên dữ liệu riêng của công ty.",
  },
  {
    icon: Sparkles,
    title: "AI Automation",
    description:
      "Tự động hóa các quy trình nhập liệu, phân loại email và xử lý tác vụ lặp đi lặp lại.",
  },
  {
    icon: ArrowRight,
    title: "Recommendation System",
    description:
      "Hệ thống gợi ý sản phẩm hoặc nội dung cá nhân hóa để tăng tỷ lệ chuyển đổi bán hàng.",
  },
  {
    icon: FileCheck2,
    title: "Document AI",
    description:
      "Trích xuất thông tin từ hóa đơn, hợp đồng và số hóa kho tài liệu khổng lồ một cách chính xác.",
  },
  {
    icon: Workflow,
    title: "Data Dashboard",
    description:
      "Phân tích dữ liệu lớn và trực quan hóa xu hướng để hỗ trợ ra quyết định kinh doanh.",
  },
] as const;

const faqs = [
  {
    question: "Làm thế nào để chọn được chuyên gia phù hợp nhất?",
    answer:
      "Bạn có thể dựa vào điểm đánh giá, lịch sử dự án, portfolio và bài kiểm tra năng lực của chuyên gia trên hệ thống. Ngoài ra, AI Matching của chúng tôi sẽ gợi ý top 3 ứng viên sát nhất với yêu cầu của bạn.",
  },
  {
    question: "Tiền của tôi có được an toàn khi thanh toán trước không?",
    answer:
      "Có. AITASKER sử dụng hệ thống Escrow. Tiền của bạn sẽ được hệ thống giữ lại và chỉ chuyển cho chuyên gia sau khi bạn đã kiểm tra và bấm xác nhận hoàn thành công việc theo từng mốc.",
  },
  {
    question: "Dự án của tôi yêu cầu bảo mật cao, AITASKER hỗ trợ như thế nào?",
    answer:
      "Tất cả các dự án trên nền tảng đều được áp dụng thỏa thuận bảo mật NDA tiêu chuẩn. Bạn cũng có thể đăng tải bản NDA riêng của công ty để chuyên gia ký kết điện tử trước khi bắt đầu dự án.",
  },
  {
    question: "Nếu dự án không đạt yêu cầu như cam kết thì sao?",
    answer:
      "Bạn có quyền yêu cầu chuyên gia chỉnh sửa theo đúng mô tả ban đầu. Nếu vẫn không đạt được thỏa thuận, bạn có thể kích hoạt quy trình tranh chấp để đội ngũ AITASKER xem xét hoàn tiền hoặc bồi thường dựa trên bằng chứng.",
  },
  {
    question: "Tôi có thể thuê chuyên gia dài hạn không?",
    answer:
      "Hoàn toàn được. Nền tảng hỗ trợ cả dự án theo gói và thuê theo thời gian cho các nhu cầu hợp tác dài hạn.",
  },
] as const;

export function LandingPage() {
  const location = useLocation();
  const session = useSession();
  const experience = getPublicExperience(session);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const targetId =
      location.pathname === "/how-it-works"
        ? "how-it-works"
        : location.pathname === "/about"
          ? "about"
          : undefined;

    if (!targetId) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = document.getElementById(targetId);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.pathname]);

  const primaryLabel = session ? experience.primaryLabel : "Đăng dự án ngay";
  const secondaryLabel = session ? experience.secondaryLabel : "Tìm việc AI";

  return (
    <main className="overflow-x-hidden bg-[#fff8f8] text-[#27171d] relative">
      <section className="relative flex min-h-[80vh] items-center overflow-hidden px-4 pb-24 pt-20 md:px-10 md:pb-32">
        <div className="absolute inset-0 z-0 bg-[#fff8f8] opacity-10 [background-image:radial-gradient(#df0e84_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute right-[-10rem] top-0 h-[50rem] w-[50rem] rounded-full bg-[#ffb0cc]/30 blur-3xl" />
        <div className="absolute left-[-12rem] top-[-12rem] h-[38rem] w-[38rem] rounded-full bg-[#d8e2ff]/30 blur-3xl" />

        <ScrollReveal className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-20 lg:grid-cols-2">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-3">
              <Badge
                tone="brand"
                className="w-fit border-0 bg-[#0070ea] px-3 py-1 text-[12px] font-semibold text-black ring-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Nền tảng AI Freelance số 1
              </Badge>

              <h1 className="max-w-xl text-[3.25rem] font-bold leading-[1.06] tracking-[-0.04em] text-[#27171d] md:text-[4.25rem]">
                Nền tảng kết nối doanh nghiệp với{" "}
                <span className="relative inline-block text-[#b30069]">
                  chuyên gia AI
                  <svg
                    className="absolute -bottom-2 left-0 h-3 w-full text-[#0070ea]"
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 5 Q 50 10 100 5"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                  </svg>
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-[18px] leading-9 text-[#594048]">
                AITASKER giúp bạn tìm kiếm, thuê và quản lý dự án AI trọn vẹn từ
                hợp đồng đến thanh toán trên một hệ thống minh bạch.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton
                to={experience.primaryPath}
                className="h-11 rounded-lg bg-[#fff0f3] px-6 text-[15px] font-bold text-[#b30069] shadow-sm transition-all hover:-translate-y-1 hover:bg-[#ffe0ea] hover:shadow-lg"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton
                to={experience.secondaryPath}
                variant="secondary"
                className="h-11 rounded-lg border-[#8d6f79] px-6 text-[15px] font-medium text-[#27171d] transition-all hover:-translate-y-1 hover:bg-[#fff0f3] hover:shadow-lg"
              >
                {secondaryLabel}
                <Search className="h-4 w-4" />
              </LinkButton>
            </div>

            <div className="flex items-center gap-4 border-t border-[#f8dbe3] pt-7">
              <div className="flex -space-x-2">
                <Avatar
                  name="Lan Anh"
                  size="sm"
                  className="ring-2 ring-[#fff8f8]"
                />
                <Avatar
                  name="Minh Khoa"
                  size="sm"
                  className="ring-2 ring-[#fff8f8]"
                />
                <Avatar
                  name="Bảo Ngọc"
                  size="sm"
                  className="ring-2 ring-[#fff8f8]"
                />
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffd9e4] text-xs font-bold text-[#b30069] ring-2 ring-[#fff8f8]">
                  5k+
                </span>
              </div>
              <p className="text-[18px] text-[#594048]">
                Hơn{" "}
                <span className="font-extrabold text-[#27171d]">5,000+</span>{" "}
                chuyên gia đã tham gia
              </p>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="rounded-[1.75rem] border border-[#e1bdc8]/30 bg-[rgba(255,240,243,0.7)] p-2 shadow-[0_18px_40px_rgba(61,44,49,.12)] backdrop-blur-[10px]">
              <img
                src={heroImage}
                alt="Minh họa cộng tác AI"
                className="h-[25rem] w-full rounded-[1.25rem] object-cover"
              />
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="bg-white px-4 py-24 md:px-10">
        <div className="mx-auto max-w-7xl relative z-10">
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-[2.2rem] font-bold text-[#27171d]">
              Tính năng nổi bật
            </h2>
            <p className="mt-4 text-[18px] leading-8 text-[#594048]">
              Hệ sinh thái công cụ toàn diện giúp quá trình hợp tác trở nên dễ
              dàng và an toàn hơn bao giờ hết.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 md:auto-rows-[250px]">
            <ScrollReveal delay={0.1}>
              <Card className="rounded-[2rem] border-2 border-[#f0dbe3] bg-white p-8 shadow-none transition-colors hover:bg-[#ffe8ee] h-full">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-[#df0e84] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-[2rem] font-bold text-[#27171d]">
                  Hồ sơ xác minh
                </h3>
                <p className="text-[15px] leading-7 text-[#594048]">
                  100% chuyên gia trên nền tảng đều trải qua quy trình kiểm tra
                  năng lực và danh tính nghiêm ngặt.
                </p>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <Card className="rounded-[2rem] border-2 border-[#f0dbe3] bg-white p-8 shadow-none transition-colors hover:bg-[#ffe8ee] h-full">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-white text-[#b30069] shadow-sm">
                  <WalletCards className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-[2rem] font-bold text-[#27171d]">
                  Ví điện tử & Thanh toán
                </h3>
                <p className="text-[15px] leading-7 text-[#594048]">
                  Bảo mật tuyệt đối với hệ thống Escrow. Tiền chỉ được giải ngân
                  khi bạn hài lòng với kết quả nghiệm thu.
                </p>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <Card className="rounded-[2rem] border-2 border-[#f0dbe3] bg-white p-8 shadow-none transition-colors hover:bg-[#ffe8ee] h-full">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-[#2e7e94] text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-[2rem] font-bold text-[#27171d]">
                  Quản lý tiến độ
                </h3>
                <p className="text-[15px] leading-7 text-[#594048]">
                  Chia nhỏ dự án thành các mốc rõ ràng, dễ dàng theo dõi và đánh
                  giá từng giai đoạn.
                </p>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <Card className="rounded-[2rem] border-2 border-[#f0dbe3] bg-white p-8 shadow-none transition-colors hover:bg-[#ffe8ee] h-full">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-white text-[#df0e84] shadow-sm">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-[2rem] font-bold text-[#27171d]">
                  Hợp đồng & NDA điện tử
                </h3>
                <p className="text-[15px] leading-7 text-[#594048]">
                  Ký kết văn bản pháp lý trực tuyến nhanh chóng, đảm bảo tính
                  bảo mật và quyền sở hữu trí tuệ.
                </p>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#fff8f8] px-4 py-24 md:px-10">
        <div className="mx-auto max-w-7xl relative z-10">
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-[2.2rem] font-bold text-[#27171d]">
              Quy trình vận hành của AITASKER
            </h2>
            <p className="mt-4 text-[18px] leading-8 text-[#594048]">
              Quy trình chuyên nghiệp được tinh gọn để tối ưu thời gian cho cả
              doanh nghiệp và chuyên gia.
            </p>
          </ScrollReveal>

          <div className="mt-16 grid gap-6 lg:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <ScrollReveal key={step.title} delay={(index + 1) * 0.1}>
                <Card className="rounded-[1.75rem] border border-[#f0dbe3] bg-white p-7 shadow-none h-full">
                  <div className="flex h-full flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0f3] text-lg font-bold text-[#b30069]">
                        0{index + 1}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#d49ab6]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#27171d]">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-[15px] leading-7 text-[#594048]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-24 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 relative z-10">
          <ScrollReveal delay={0.1} className="h-full">
            <Card className="rounded-[2rem] border-2 border-[#f0dbe3] bg-white p-10 shadow-none h-full flex flex-col">
              <h3 className="text-[2rem] font-bold text-[#27171d]">
                Dành cho Doanh nghiệp
              </h3>
              <p className="mt-4 text-[17px] leading-8 text-[#594048]">
                Tăng tốc chuyển đổi số với đội ngũ chuyên gia AI phù hợp, quy
                trình rõ ràng và hệ thống kiểm soát rủi ro minh bạch.
              </p>
              <ul className="mt-8 space-y-4 flex-1">
                {[
                  "Tuyển dụng nhanh hơn 3 lần với bộ lọc thông minh",
                  "Đảm bảo an toàn tài chính với thanh toán Escrow",
                  "Quản lý tập trung mọi dự án trên một dashboard",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[15px] leading-7 text-[#27171d]"
                  >
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#b30069]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <LinkButton
                to={experience.primaryPath}
                className="mt-10 h-12 w-full rounded-xl border-2 border-transparent bg-[#b30069] px-6 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-[#b30069] hover:bg-white hover:text-[#b30069] hover:shadow-lg"
              >
                Tôi cần thuê chuyên gia
              </LinkButton>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.2} className="h-full">
            <Card className="rounded-[2rem] border-2 border-[#f0dbe3] bg-white p-10 shadow-none h-full flex flex-col">
              <h3 className="text-[2rem] font-bold text-[#27171d]">
                Dành cho Chuyên gia
              </h3>
              <p className="mt-4 text-[17px] leading-8 text-[#594048]">
                Làm việc với doanh nghiệp chất lượng, bảo vệ quyền lợi nghề
                nghiệp và phát triển sự nghiệp AI dài hạn.
              </p>
              <ul className="mt-8 space-y-4 flex-1">
                {[
                  "Cơ hội làm việc với các doanh nghiệp uy tín toàn cầu",
                  "Hỗ trợ pháp lý và bảo vệ quyền lợi freelancer",
                  "Tự do làm việc linh hoạt, nâng cao thu nhập",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[15px] leading-7 text-[#27171d]"
                  >
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#b30069]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <LinkButton
                to={experience.secondaryPath}
                className="mt-10 h-12 w-full rounded-xl border-2 border-transparent bg-[#b30069] px-6 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-[#b30069] hover:bg-white hover:text-[#b30069] hover:shadow-lg"
              >
                Tôi muốn tìm việc AI
              </LinkButton>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-[#fff8f8] px-4 py-24 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-16 lg:flex-row lg:items-center relative z-10">
          <ScrollReveal className="lg:w-1/2">
            <h2 className="text-[2.2rem] font-bold text-[#27171d]">
              Hợp tác minh bạch & Tin cậy
            </h2>
            <p className="mt-6 text-[18px] leading-8 text-[#594048]">
              Chúng tôi xây dựng các lớp bảo vệ để đảm bảo mọi dự án đều kết
              thúc thành công với sự hài lòng từ cả hai phía.
            </p>

            <div className="mt-10 space-y-6">
              {trustHighlights.map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffe8ee] text-[#b30069]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#27171d]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-7 text-[#594048]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:w-1/2">
            {trustCards.map((item, index) => (
              <ScrollReveal
                key={item.title}
                delay={(index + 1) * 0.1}
                className={item.offset ? "sm:translate-y-8" : ""}
              >
                <Card className="rounded-[1.75rem] border border-white bg-white p-6 shadow-[0_12px_28px_rgba(61,44,49,.08)] h-full">
                  <item.icon className="mb-4 h-8 w-8 text-[#0070ea]" />
                  <h3 className="text-lg font-bold text-[#27171d]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#594048]">
                    {item.description}
                  </p>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-24 md:px-10">
        <div className="mx-auto max-w-7xl relative z-10">
          <ScrollReveal className="text-center">
            <h2 className="text-[2.2rem] font-bold text-[#27171d]">
              Tình huống sử dụng thực tế
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[18px] leading-8 text-[#594048]">
              Khám phá các loại hình dự án AI phổ biến đang được triển khai
              thành công trên AITASKER.
            </p>
          </ScrollReveal>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item, index) => (
              <ScrollReveal key={item.title} delay={(index + 1) * 0.1}>
                <Card className="rounded-[1.75rem] border border-[#f1e4e8] bg-white p-8 shadow-none h-full">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#fff0f3] text-[#b30069]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-[1.3rem] font-bold text-[#27171d]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-[#594048]">
                    {item.description}
                  </p>
                </Card>
              </ScrollReveal>
            ))}

            <ScrollReveal delay={(useCases.length + 1) * 0.1}>
              <Card className="flex h-full rounded-[1.75rem] border-2 border-dashed border-[#e4cad5] bg-[#fff8f8] p-8 shadow-none">
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <p className="text-[15px] italic leading-7 text-[#594048]">
                    Dự án của bạn đặc thù hơn?
                  </p>
                  <LinkButton
                    to="/about"
                    variant="ghost"
                    className="mt-3 h-auto px-0 text-[15px] font-bold text-[#b30069] transition-transform hover:-translate-y-1 hover:bg-transparent"
                  >
                    Liên hệ tư vấn
                    <ArrowRight className="h-4 w-4" />
                  </LinkButton>
                </div>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="bg-[#fff8f8] px-4 py-24 md:px-10">
        <div className="mx-auto max-w-3xl relative z-10">
          <ScrollReveal className="text-center">
            <h2 className="text-[2.2rem] font-bold text-[#27171d]">
              Câu hỏi thường gặp
            </h2>
            <p className="mt-4 text-[18px] leading-8 text-[#594048]">
              Mọi thông tin bạn cần để bắt đầu hành trình cùng AITASKER.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2} className="mt-16 space-y-4">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={item.question}
                  className="overflow-hidden rounded-2xl border border-[#ead8e0] bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-[15px] font-bold text-[#27171d]">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[#8d6f79] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen ? (
                    <p className="px-6 pb-6 text-[15px] leading-7 text-[#594048]">
                      {item.answer}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </ScrollReveal>
        </div>
      </section>

      <section className="px-4 py-24 md:px-10">
        <ScrollReveal className="relative z-10 mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#b30069]/70 backdrop-blur-xl border border-white/20 px-8 py-14 text-center text-white shadow-[0_28px_60px_rgba(129,19,78,.28)] md:px-12">
          <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[#4bb8ff]/20 blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-[2.2rem] font-bold leading-tight md:text-[2.8rem]">
              Sẵn sàng để đưa dự án AI của bạn lên tầm cao mới?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-8 text-white/90">
              Tham gia cùng hàng nghìn doanh nghiệp đang chuyển đổi số thành
              công bằng sức mạnh của AI và mạng lưới chuyên gia hàng đầu.
            </p>

            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <LinkButton
                to={experience.primaryPath}
                variant="secondary"
                className="h-12 rounded-xl border border-white/40 bg-white/10 px-8 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-white hover:bg-white hover:text-[#b30069] hover:shadow-lg"
              >
                Đăng dự án ngay
              </LinkButton>
              <LinkButton
                to={experience.secondaryPath}
                variant="secondary"
                className="h-12 rounded-xl border border-white/40 bg-white/10 px-8 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-white hover:bg-white hover:text-[#b30069] hover:shadow-lg"
              >
                Tham gia mạng lưới chuyên gia
              </LinkButton>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="bg-white px-4 pb-24 md:px-10">
        <ScrollReveal className="relative z-10 mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-[#f0dbe3] bg-[#fff8f8] p-8 lg:grid-cols-[1.2fr_.8fr] lg:p-10">
          <div>
            <h2 className="text-[2rem] font-bold text-[#27171d]">
              AITASKER dành cho hệ sinh thái AI chuyên nghiệp
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#594048]">
              Từ startup đang thử nghiệm MVP đến doanh nghiệp cần chuẩn hóa quy
              trình AI, AITASKER tạo ra một nơi làm việc đủ nhanh, đủ an toàn và
              đủ minh bạch để hợp tác lâu dài.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5">
              <Globe className="h-6 w-6 text-[#0070ea]" />
              <p className="mt-3 text-sm font-bold text-[#27171d]">
                Mạng lưới toàn cầu
              </p>
              <p className="mt-1 text-sm leading-6 text-[#594048]">
                Kết nối với chuyên gia AI ở nhiều thị trường và lĩnh vực.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5">
              <ShieldCheck className="h-6 w-6 text-[#b30069]" />
              <p className="mt-3 text-sm font-bold text-[#27171d]">
                Vận hành an toàn
              </p>
              <p className="mt-1 text-sm leading-6 text-[#594048]">
                Quy trình có Escrow, NDA và đánh giá hai chiều rõ ràng.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* AI/SaaS Light Mesh Grid Background Overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 ai-grid-layer" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] z-0 opacity-40 bottom-glow-overlay" />
    </main>
  );
}
