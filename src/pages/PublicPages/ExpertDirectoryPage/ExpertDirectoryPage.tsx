import { BarChart3, Bot, BriefcaseBusiness, CheckCircle2, Cpu, Eye, FileSignature, MessageSquareText, PenTool, ShieldCheck, Sparkles, Target, Workflow } from "lucide-react";
import { useSession } from "../../../lib/session";
import { Badge, Button, Card, LinkButton } from "../../../components/ui";
import { ScrollReveal } from "../../../components/ui/ScrollReveal";
import { heroImage } from "../PublicPages.shared";

export function ExpertDirectoryPage() {
  const session = useSession();

  return (
    <div className="relative overflow-hidden bg-[#f7faff] pb-24 pt-16">
      <div className="absolute inset-0 z-0 opacity-[0.03] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#f7faff] via-transparent to-transparent" />
      <main className="relative z-10 mx-auto max-w-7xl px-4 md:px-6">
        {/* Section 1: Hero */}
        <ScrollReveal>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge tone="brand">EXPERT NETWORK</Badge>
              <h1 className="mt-6 font-display text-4xl font-black leading-tight tracking-[-0.02em] text-ink lg:text-5xl lg:leading-[1.15]">
                Mạng lưới chuyên gia AI sẵn sàng đồng hành cùng doanh nghiệp
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Kết nối với các chuyên gia AI dã dược chọn lọc, có năng lực thực
                chiến và phù hợp với nhu cầu dự án của bạn — từ tư vấn chiến
                lược, xây dựng chatbot, automation, phân tích dữ liệu dến triển
                khai mô hình AI.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <LinkButton
                  size="lg"
                  to={session ? "/app/opportunities" : "/register"}
                >
                  Tìm dự án ngay
                </LinkButton>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() =>
                    document
                      .getElementById("process-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Tìm hiểu quy trình
                </Button>
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
          </div>
        </ScrollReveal>

        {/* Section 2: Trust metrics */}
        <ScrollReveal>
          <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Chuyên gia đã tham gia", value: "5,000+" },
              { label: "Lĩnh vực AI", value: "30+" },
              { label: "Hồ sơ dược kiểm tra", value: "100%" },
              { label: "Hợp đồng & thanh toán", value: "Minh bạch" },
            ].map((metric) => (
              <Card
                key={metric.label}
                className="flex flex-col items-center justify-center p-8 text-center"
              >
                <p className="font-display text-4xl font-black text-brand-600">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm font-bold text-slate-600">
                  {metric.label}
                </p>
              </Card>
            ))}
          </div>
        </ScrollReveal>

        {/* Section 3: AI Capabilities Grid */}
        <ScrollReveal>
          <div className="mt-32 text-center">
            <h2 className="font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Chuyên gia AI cho mọi nhu cầu
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Đội ngũ chuyên gia da dạng, dáp ứng toàn diện vòng dời phát triển
              dự án AI của doanh nghiệp.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "AI Strategy Consultant",
                desc: "Tư vấn lộ trình ứng dụng AI, dánh giá tính khả thi và thiết kế kiến trúc hệ thống.",
                icon: <BriefcaseBusiness />,
              },
              {
                title: "Chatbot & Conversational AI",
                desc: "Xây dựng trợ lý ảo thông minh, tích hợp LLMs vào quy trình chăm sóc khách hàng.",
                icon: <Bot />,
              },
              {
                title: "Computer Vision",
                desc: "Phân tích hình ảnh, nhận diện khuôn mặt, OCR và kiểm tra chất lượng tự động.",
                icon: <Eye />,
              },
              {
                title: "Data Science & Analytics",
                desc: "Khai phá dữ liệu, dự báo xu hướng và xây dựng dashboard BI nâng cao.",
                icon: <BarChart3 />,
              },
              {
                title: "Workflow Automation",
                desc: "Tự dộng hóa quy trình nghiệp vụ với AI agent, n8n, Zapier và RPA.",
                icon: <Workflow />,
              },
              {
                title: "Machine Learning Engineer",
                desc: "Huấn luyện, fine-tune và deploy các mô hình ML lên môi trường production.",
                icon: <Cpu />,
              },
              {
                title: "AI Product Designer",
                desc: "Thiết kế trải nghiệm người dùng tối ưu cho các sản phẩm tích hợp AI.",
                icon: <PenTool />,
              },
              {
                title: "Prompt Engineer",
                desc: "Tối ưu hóa câu lệnh giao tiếp với AI dể dạt dược kết quả chính xác cao nhất.",
                icon: <MessageSquareText />,
              },
            ].map((role) => (
              <Card key={role.title} hover className="p-6">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  {role.icon}
                </span>
                <h3 className="text-lg font-extrabold text-ink">
                  {role.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {role.desc}
                </p>
              </Card>
            ))}
          </div>
        </ScrollReveal>

        {/* Section 4: Why choose AITASKER experts? */}
        <ScrollReveal>
          <div className="mt-32">
            <h2 className="text-center font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Vì sao doanh nghiệp chọn chuyên gia trên AITASKER?
            </h2>
            <div className="mt-12 grid gap-8 lg:grid-cols-4">
              {[
                {
                  title: "Hồ sơ dược xác minh",
                  desc: "Mọi chuyên gia dều phải trải qua quá trình KYC và kiểm dịnh năng lực khắt khe.",
                  icon: <ShieldCheck />,
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  title: "AI gợi ý chuyên gia",
                  desc: "Hệ thống AI tự động phân tích SoW và match dúng chuyên gia phù hợp nhất.",
                  icon: <Sparkles />,
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  title: "Làm việc theo mốc",
                  desc: "Chia nhỏ dự án thành các mốc rõ ràng, dễ dàng nghiệm thu và quản lý rủi ro.",
                  icon: <Target />,
                  color: "text-brand-600",
                  bg: "bg-brand-50",
                },
                {
                  title: "Minh bạch hợp đồng & escrow",
                  desc: "Hợp đồng diện tử, NDA bảo mật và cơ chế giữ tiền an toàn cho cả hai bên.",
                  icon: <FileSignature />,
                  color: "text-indigo-600",
                  bg: "bg-indigo-50",
                },
              ].map((reason) => (
                <div key={reason.title} className="text-center">
                  <span
                    className={`mx-auto grid h-16 w-16 place-items-center rounded-[2rem] ${reason.bg} ${reason.color} mb-6`}
                  >
                    {reason.icon}
                  </span>
                  <h3 className="text-lg font-extrabold text-ink">
                    {reason.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {reason.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Section 5: Process */}
        <ScrollReveal>
          <Card
            id="process-section"
            className="mt-32 bg-gradient-to-br from-white to-slate-50/50 p-8 md:p-12 lg:p-16"
          >
            <h2 className="text-center font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Quy trình kết nối chuyên gia
            </h2>
            <div className="relative mt-16 grid gap-12 lg:grid-cols-4">
              <div className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-slate-200 lg:block" />
              {[
                {
                  step: 1,
                  title: "Mô tả nhu cầu",
                  desc: "Doanh nghiệp dăng tải yêu cầu dự án AI cần giải quyết.",
                },
                {
                  step: 2,
                  title: "AI gợi ý chuyên gia",
                  desc: "Hệ thống phân tích và dề xuất chuyên gia phù hợp năng lực.",
                },
                {
                  step: 3,
                  title: "Ký hợp đồng",
                  desc: "Trao dổi proposal, chốt ngân sách và ký hợp đồng diện tử.",
                },
                {
                  step: 4,
                  title: "Nghiệm thu",
                  desc: "Theo dõi mốc, nghiệm thu công việc và thanh toán.",
                },
              ].map((step) => (
                <div key={step.step} className="relative z-10 text-center">
                  <span className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border-4 border-[#f7faff] bg-brand-600 text-xl font-black text-white shadow-xl shadow-brand-600/20">
                    {step.step}
                  </span>
                  <h3 className="text-lg font-extrabold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </ScrollReveal>

        {/* Section 6: Trust features */}
        <ScrollReveal>
          <div className="mt-32 border-y border-slate-200/60 py-16">
            <div className="mb-12 text-center">
              <h2 className="font-display text-2xl font-black text-ink">
                Hợp tác minh bạch & tin cậy
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {[
                "Định danh KYC/KYB",
                "Ký NDA diện tử",
                "Hợp đồng pháp lý",
                "Thanh toán Escrow",
                "Đánh giá năng lực",
                "Hỗ trợ giải quyết tranh chấp",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="font-bold text-slate-600">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </main>
    </div>
  );
}
