import { BarChart3, Bot, BriefcaseBusiness, CheckCircle2, Cpu, Eye, FileSignature, PenTool, ShieldCheck, Sparkles, Target, Workflow } from "lucide-react";
import { getPublicExperience } from "../../../lib/roleExperience";
import { useSession } from "../../../lib/session";
import { Badge, Button, Card, LinkButton } from "../../../components/ui";
import { ScrollReveal } from "../../../components/ui/ScrollReveal";
import { heroImage } from "../PublicPages.shared";

export function JobsPage() {
  const session = useSession();
  const publicExperience = getPublicExperience(session);

  return (
    <div className="relative overflow-x-hidden bg-[#f7faff] pb-24 pt-16">
      <main className="relative z-10 mx-auto max-w-7xl px-4 md:px-6">
        {/* Section 1: Hero */}
        <ScrollReveal>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge
                tone="brand"
                className="bg-[#ffe6f0] text-[#C50070] ring-[#f6dce5]"
              >
            GIẢI PHÁP DOANH NGHIỆP
              </Badge>
              <h1 className="mt-6 font-display text-4xl font-black leading-tight tracking-[-0.02em] text-ink lg:text-5xl lg:leading-[1.15]">
                Đưa dự án AI của doanh nghiệp từ ý tưởng đến triển khai thực tế
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                AITASKER giúp doanh nghiệp tìm đúng chuyên gia AI, đăng dự án
                nhanh chóng, nhận đề xuất phù hợp và quản lý toàn bộ quá trình
                hợp tác qua hợp đồng, cột mốc, ký quỹ và nghiệm thu minh bạch.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <LinkButton
                  size="lg"
                  to={publicExperience.primaryPath}
                  className="bg-[#C50070] text-white hover:bg-[#a3005c]"
                >
                  Bắt đầu dự án
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
              { label: "Chuyên gia trong mạng lưới", value: "5,000+" },
              { label: "Lĩnh vực AI có thể triển khai", value: "30+" },
              { label: "Hợp đồng, bảo mật và ký quỹ", value: "Minh bạch" },
              { label: "Nhận đề xuất phù hợp", value: "Nhanh chóng" },
            ].map((metric) => (
              <Card
                key={metric.label}
                className="flex flex-col items-center justify-center p-8 text-center"
              >
                <p className="font-display text-4xl font-black text-[#C50070]">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm font-bold text-slate-600">
                  {metric.label}
                </p>
              </Card>
            ))}
          </div>
        </ScrollReveal>

        {/* Section 3: AI Capabilities */}
        <ScrollReveal>
          <div className="mt-32 text-center">
            <h2 className="font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Doanh nghiệp có thể triển khai gì với AITASKER?
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Chatbot chăm sóc khách hàng",
                desc: "Tích hợp trợ lý ảo AI để hỗ trợ khách hàng 24/7.",
                icon: <Bot />,
              },
              {
                title: "Tự động hóa quy trình nội bộ",
                desc: "Tối ưu hóa các tác vụ lặp di lặp lại bằng AI và RPA.",
                icon: <Workflow />,
              },
              {
                title: "Phân tích dữ liệu kinh doanh",
                desc: "Dự báo xu hướng và phân tích dữ liệu để ra quyết định.",
                icon: <BarChart3 />,
              },
              {
                title: "Computer Vision",
                desc: "Nhận diện hình ảnh, OCR và kiểm tra chất lượng tự động.",
                icon: <Eye />,
              },
              {
                title: "AI Recommendation System",
                desc: "Hệ thống gợi ý sản phẩm giúp tăng tỷ lệ chuyển dổi.",
                icon: <Cpu />,
              },
              {
                title: "Xây dựng MVP sản phẩm AI",
                desc: "Triển khai nhanh chóng phiên bản MVP để thử nghiệm thị trường.",
                icon: <PenTool />,
              },
              {
                title: "Tối ưu vận hành bằng AI",
                desc: "Ứng dụng AI để giảm chi phí và nâng cao hiệu suất hoạt động.",
                icon: <Target />,
              },
              {
                title: "Tư vấn chiến lược AI",
                desc: "Xây dựng lộ trình ứng dụng AI phù hợp với mục tiêu kinh doanh.",
                icon: <BriefcaseBusiness />,
              },
            ].map((role) => (
              <Card key={role.title} hover className="p-6">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#ffe6f0] text-[#C50070]">
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

        {/* Section 4: Why choose us */}
        <ScrollReveal>
          <div className="mt-32">
            <h2 className="text-center font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Vì sao doanh nghiệp chọn AITASKER?
            </h2>
            <div className="mt-12 grid gap-8 lg:grid-cols-4">
              {[
                {
                  title: "Tìm chuyên gia phù hợp bằng đối sánh AI",
                  desc: "Thuật toán thông minh tự động phân tích dự án và đề xuất chuyên gia có kỹ năng sát nhất.",
                  icon: <Sparkles />,
                  color: "text-[#0B7AEA]",
                  bg: "bg-[#e6f0ff]",
                },
                {
                  title: "Hồ sơ chuyên gia được kiểm tra",
                  desc: "100% chuyên gia trên hệ thống đều trải qua quá trình xác minh danh tính và kiểm định năng lực.",
                  icon: <ShieldCheck />,
                  color: "text-teal-600",
                  bg: "bg-teal-50",
                },
                {
                  title: "Quản lý dự án theo mốc",
                  desc: "Chia nhỏ dự án thành các giai đoạn rõ ràng để dễ dàng nghiệm thu và đánh giá tiến độ.",
                  icon: <Target />,
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  title: "Thanh toán an toàn qua ký quỹ",
                  desc: "Ngân sách được hệ thống giữ an toàn và chỉ giải ngân khi bạn đã nghiệm thu công việc.",
                  icon: <FileSignature />,
                  color: "text-[#C50070]",
                  bg: "bg-[#ffe6f0]",
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
            className="mt-32 bg-gradient-to-br from-white to-[#ffe6f0]/20 p-8 md:p-12 lg:p-16"
          >
            <h2 className="text-center font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Quy trình dành cho doanh nghiệp
            </h2>
            <div className="relative mt-16 grid gap-12 lg:grid-cols-4">
              <div className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-slate-200 lg:block" />
              {[
                {
                  step: 1,
                  title: "Mô tả nhu cầu dự án AI",
                  desc: "Đăng tải yêu cầu chi tiết về bài toán doanh nghiệp cần giải quyết.",
                },
                {
                  step: 2,
                  title: "Nhận gợi ý chuyên gia và bản đề xuất phù hợp",
                  desc: "Hệ thống đề xuất chuyên gia phù hợp và nhận báo giá chi tiết.",
                },
                {
                  step: 3,
                  title: "Ký hợp đồng, thỏa thuận bảo mật và thống nhất cột mốc",
                  desc: "Ký kết văn bản pháp lý điện tử và chốt kế hoạch thực hiện.",
                },
                {
                  step: 4,
                  title: "Theo dõi tiến dộ, nghiệm thu và thanh toán",
                  desc: "Quản lý tiến dộ theo từng mốc và thanh toán minh bạch qua escrow.",
                },
              ].map((step) => (
                <div key={step.step} className="relative z-10 text-center">
                  <span className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-[#C50070] text-xl font-black text-white shadow-xl shadow-[#C50070]/20">
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
        {/* Section 7: Trust features */}
        <ScrollReveal>
          <div className="mt-32 border-y border-slate-200/60 py-16">
            <div className="mb-12 text-center">
              <h2 className="font-display text-2xl font-black text-ink">
                Hợp tác minh bạch & kiểm soát rủi ro
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {[
                "KYB/KYC",
                "Thỏa thuận bảo mật điện tử",
                "Hợp đồng điện tử",
                "Escrow",
                "Mốc rõ ràng",
                "Đánh giá sau dự án",
                "Quản lý tranh chấp",
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

      {/* AI/SaaS Light Mesh Grid Background Overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 ai-grid-layer" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] z-0 opacity-40 bottom-glow-overlay" />
    </div>
  );
}
