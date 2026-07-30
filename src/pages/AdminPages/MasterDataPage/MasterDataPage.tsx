import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
} from "../../../components/ui";
import { catalogApi, type Domain, type Skill, type Technology } from "../../../lib/api";
import { AdminPagination, DateTimeCell } from "../AdminPages.shared";

type CatalogTab = "domains" | "skills" | "technologies";
type CatalogItem = Domain | Skill | Technology;

const CATALOG_ITEMS_PER_PAGE = 10;

type CatalogForm = {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

const tabLabels: Record<CatalogTab, string> = {
  domains: "Lĩnh vực",
  skills: "Kỹ năng",
  technologies: "Công nghệ",
};

const blankForm: CatalogForm = {
  code: "",
  name: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

function itemCode(item: CatalogItem) {
  if ("domainCode" in item) return item.domainCode;
  if ("skillCode" in item) return item.skillCode;
  return item.technologyCode;
}

function itemName(item: CatalogItem) {
  if ("domainName" in item) return item.domainName;
  if ("skillName" in item) return item.skillName;
  return item.technologyName;
}

function itemKey(tab: CatalogTab, item: CatalogItem) {
  return `${tab}-${itemCode(item)}`;
}

function isInternalDomain(item: CatalogItem) {
  return "domainCode" in item && item.domainCode === "PROFILE_REVIEW";
}

export function MasterDataPage() {
  const [tab, setTab] = useState<CatalogTab>("domains");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<CatalogForm>(blankForm);
  const [currentPage, setCurrentPage] = useState(1);

  const loadCatalog = async () => {
    setLoading(true);
    setError("");
    try {
      const [domainItems, skillItems, technologyItems] = await Promise.all([
        catalogApi.listDomains(false),
        catalogApi.listSkills(false),
        catalogApi.listTechnologies(false),
      ]);
      setDomains(domainItems);
      setSkills(skillItems);
      setTechnologies(technologyItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu nền tảng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadCatalog);
  }, []);

  const items = useMemo(() => {
    const source = tab === "domains" ? domains : tab === "skills" ? skills : technologies;
    return [...source].sort((left, right) => {
      const leftSort = "sortOrder" in left ? left.sortOrder || 0 : 0;
      const rightSort = "sortOrder" in right ? right.sortOrder || 0 : 0;
      if (leftSort !== rightSort) return leftSort - rightSort;
      return itemName(left).localeCompare(itemName(right), "vi");
    });
  }, [domains, skills, technologies, tab]);
  const totalPages = Math.max(1, Math.ceil(items.length / CATALOG_ITEMS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedItems = items.slice(
    (effectivePage - 1) * CATALOG_ITEMS_PER_PAGE,
    effectivePage * CATALOG_ITEMS_PER_PAGE,
  );

  const beginCreate = () => {
    const nextSort = Math.max(0, ...items.map((item) => ("sortOrder" in item ? item.sortOrder || 0 : 0))) + 1;
    setEditing(null);
    setForm({ ...blankForm, sortOrder: tab === "skills" ? 0 : nextSort });
    setModalOpen(true);
  };

  const beginEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({
      code: itemCode(item),
      name: itemName(item),
      description: item.description || "",
      isActive: item.isActive,
      sortOrder: "sortOrder" in item ? item.sortOrder || 0 : 0,
    });
    setModalOpen(true);
  };

  const replaceItem = (saved: CatalogItem) => {
    if ("domainCode" in saved) {
      setDomains((current) =>
        current.some((item) => item.domainId === saved.domainId)
          ? current.map((item) => (item.domainId === saved.domainId ? saved : item))
          : [...current, saved],
      );
    } else if ("skillCode" in saved) {
      setSkills((current) =>
        current.some((item) => item.skillId === saved.skillId)
          ? current.map((item) => (item.skillId === saved.skillId ? saved : item))
          : [...current, saved],
      );
    } else {
      setTechnologies((current) =>
        current.some((item) => item.technologyId === saved.technologyId)
          ? current.map((item) => (item.technologyId === saved.technologyId ? saved : item))
          : [...current, saved],
      );
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      let saved: CatalogItem;
      if (tab === "domains") {
        const payload = {
          domainCode: form.code,
          domainName: form.name,
          description: form.description,
          isActive: form.isActive,
          sortOrder: Number(form.sortOrder) || 0,
        };
        saved = editing && "domainId" in editing
          ? await catalogApi.updateDomain(editing.domainId, payload)
          : await catalogApi.createDomain(payload);
      } else if (tab === "skills") {
        const payload = {
          skillCode: form.code,
          skillName: form.name,
          description: form.description,
          isActive: form.isActive,
        };
        saved = editing && "skillId" in editing
          ? await catalogApi.updateSkill(editing.skillId, payload)
          : await catalogApi.createSkill(payload);
      } else {
        const payload = {
          technologyCode: form.code,
          technologyName: form.name,
          description: form.description,
          isActive: form.isActive,
          sortOrder: Number(form.sortOrder) || 0,
        };
        saved = editing && "technologyId" in editing
          ? await catalogApi.updateTechnology(editing.technologyId, payload)
          : await catalogApi.createTechnology(payload);
      }
      replaceItem(saved);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được dữ liệu nền tảng.");
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async (item: CatalogItem) => {
    setError("");
    try {
      const saved =
        "domainId" in item
          ? await catalogApi.deleteDomain(item.domainId)
          : "skillId" in item
            ? await catalogApi.deleteSkill(item.skillId)
            : await catalogApi.deleteTechnology(item.technologyId);
      replaceItem(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa mềm được dữ liệu.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_55%,#f7fbf5_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Dữ liệu nền tảng"
          description="Quản lý lĩnh vực, kỹ năng và công nghệ. Các mục bị xóa sẽ được tắt trạng thái thay vì xóa vật lý."
          actions={
            <Button onClick={beginCreate}>
              <Plus className="h-4 w-4" /> Tạo {tabLabels[tab].toLowerCase()}
            </Button>
          }
        />
      </div>

      <Card className="flex flex-wrap gap-2 p-3">
        {(Object.keys(tabLabels) as CatalogTab[]).map((key) => (
          <Button
            key={key}
            variant={tab === key ? "primary" : "secondary"}
            onClick={() => {
              setTab(key);
              setCurrentPage(1);
            }}
          >
            {tabLabels[key]}
          </Button>
        ))}
      </Card>

      {error && <Notice tone="danger" title="Có lỗi xảy ra">{error}</Notice>}

      <Card className="overflow-hidden">
        <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[210px_minmax(0,1fr)_130px_160px_160px_150px]">
          <span>Mã</span>
          <span>Mô tả</span>
          <span>Trạng thái</span>
          <span className="text-center">Ngày tạo</span>
          <span className="text-center">Cập nhật</span>
          <span>Thao tác</span>
        </div>
        {loading && <div className="px-5 py-8 text-sm font-bold text-slate-500">Đang tải dữ liệu...</div>}
        {!loading && items.length === 0 && <div className="px-5 py-8 text-sm font-bold text-slate-500">Chưa có dữ liệu.</div>}
        {!loading && paginatedItems.map((item) => (
          <div
            key={itemKey(tab, item)}
            className="grid gap-3 border-b border-slate-100 px-5 py-4 text-left text-sm md:grid-cols-[210px_minmax(0,1fr)_130px_160px_160px_150px] md:items-start"
          >
            <div className="min-w-0">
              <span className="break-all font-mono text-xs font-bold text-brand-700">{itemCode(item)}</span>
              {isInternalDomain(item) && <div className="mt-2"><Badge tone="violet">Nội bộ</Badge></div>}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-ink">{itemName(item)}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.description || "Chưa có mô tả"}</p>
            </div>
            <div>
              <Badge tone={item.isActive ? "mint" : "rose"}>{item.isActive ? "Đang bật" : "Đang tắt"}</Badge>
            </div>
            <DateTimeCell value={item.createdAt} />
            <DateTimeCell value={item.updatedAt} />
            <div className="flex flex-wrap justify-start gap-2">
              <Button variant="secondary" onClick={() => beginEdit(item)}>Sửa</Button>
              <Button variant="danger" size="icon" title="Xóa mềm" onClick={() => softDelete(item)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {!loading && (
          <AdminPagination
            currentPage={effectivePage}
            pageSize={CATALOG_ITEMS_PER_PAGE}
            totalItems={items.length}
            itemLabel={tabLabels[tab].toLowerCase()}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Cập nhật ${tabLabels[tab].toLowerCase()}` : `Tạo ${tabLabels[tab].toLowerCase()}`}
        description={editing ? "Mã định danh không thể thay đổi sau khi tạo." : "Mã sẽ được backend chuẩn hóa thành chữ in hoa và dấu gạch dưới."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={save} loading={saving}>
              <Save className="h-4 w-4" /> Lưu
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={`Mã ${tabLabels[tab].toLowerCase()}`}>
            <Input
              value={form.code}
              disabled={Boolean(editing)}
              onChange={(event) => setForm((value) => ({ ...value, code: event.target.value }))}
            />
          </Field>
          <Field label={`Tên ${tabLabels[tab].toLowerCase()}`}>
            <Input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
          </Field>
          {tab !== "skills" && (
            <Field label="Thứ tự hiển thị">
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm((value) => ({ ...value, sortOrder: Number(event.target.value) }))}
              />
            </Field>
          )}
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Đang bật
          </label>
          {form.code.trim().toUpperCase() === "PROFILE_REVIEW" && (
            <Notice tone="warning" title="Domain nội bộ" className="md:col-span-2">
              Domain này chỉ dùng để phân quyền staff xét duyệt hồ sơ và không nên dùng cho marketplace.
            </Notice>
          )}
          <Field label="Mô tả" className="md:col-span-2">
            <textarea
              value={form.description}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
