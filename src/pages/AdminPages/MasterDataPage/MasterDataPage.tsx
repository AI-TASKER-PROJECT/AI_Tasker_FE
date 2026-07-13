import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  catalogApi,
  type Domain,
  type Skill,
} from "../../../lib/api";
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
import { DateTimeCell } from "../AdminPages.shared";
import type { AcceptanceCriteria } from "../../../types";

export function MasterDataPage() {
  const [tab, setTab] = useState<"domains" | "skills" | "criteria">("domains");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriteria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [form, setForm] = useState({
    domainCode: "",
    domainName: "",
    description: "",
    isActive: true,
    sortOrder: 0,
  });
  const [skillForm, setSkillForm] = useState({
    skillCode: "",
    skillName: "",
    description: "",
    isActive: true,
  });
  const [criteriaForm, setCriteriaForm] = useState({
    criteriaCode: "",
    description: "",
    isActive: true,
    sortOrder: 0,
  });

  const loadCatalog = async () => {
    setLoading(true);
    setError("");
    try {
      const [domainItems, skillItems, criteriaItems] = await Promise.all([
        catalogApi.listDomains(false),
        catalogApi.listSkills(false),
        catalogApi.listAcceptanceCriteria(false),
      ]);
      setDomains(domainItems);
      setSkills(skillItems);
      setCriteria(criteriaItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadCatalog);
  }, []);

  const sortedDomains = [...domains].sort((left, right) => {
    const sortDelta = (left.sortOrder || 0) - (right.sortOrder || 0);
    if (sortDelta !== 0) return sortDelta;
    const nameDelta = left.domainName.localeCompare(right.domainName);
    if (nameDelta !== 0) return nameDelta;
    return left.domainId - right.domainId;
  });
  const sortedSkills = [...skills];
  const sortedCriteria = [...criteria].sort((left, right) => {
    const sortDelta = (left.sortOrder || 0) - (right.sortOrder || 0);
    if (sortDelta !== 0) return sortDelta;
    return (left.criteriaCode || "").localeCompare(right.criteriaCode || "");
  });

  const beginCreate = () => {
    setEditing(null);
    setForm({
      domainCode: "",
      domainName: "",
      description: "",
      isActive: true,
      sortOrder:
        Math.max(0, ...domains.map((domain) => domain.sortOrder || 0)) + 1,
    });
    setOpen(true);
  };

  const beginEdit = (domain: Domain) => {
    setEditing(domain);
    setForm({
      domainCode: domain.domainCode,
      domainName: domain.domainName,
      description: domain.description || "",
      isActive: domain.isActive,
      sortOrder: domain.sortOrder || 0,
    });
    setOpen(true);
  };

  const saveDomain = async () => {
    const payload = {
      domainCode: form.domainCode,
      domainName: form.domainName,
      description: form.description,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    };
    const saved = editing
      ? await catalogApi.updateDomain(editing.domainId, payload)
      : await catalogApi.createDomain(payload);
    setDomains((items) =>
      editing
        ? items.map((item) => (item.domainId === saved.domainId ? saved : item))
        : [...items, saved],
    );
    setOpen(false);
  };

  const beginCreateSkill = () => {
    setEditingSkill(null);
    setSkillForm({
      skillCode: "",
      skillName: "",
      description: "",
      isActive: true,
    });
    setSkillOpen(true);
  };

  const beginEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillForm({
      skillCode: skill.skillCode,
      skillName: skill.skillName,
      description: skill.description || "",
      isActive: skill.isActive,
    });
    setSkillOpen(true);
  };

  const saveSkill = async () => {
    const payload = {
      skillCode: skillForm.skillCode,
      skillName: skillForm.skillName,
      description: skillForm.description,
      isActive: skillForm.isActive,
    };
    const saved = editingSkill
      ? await catalogApi.updateSkill(editingSkill.skillId, payload)
      : await catalogApi.createSkill(payload);
    setSkills((items) =>
      editingSkill
        ? items.map((item) => (item.skillId === saved.skillId ? saved : item))
        : [...items, saved],
    );
    setSkillOpen(false);
  };

  const beginCreateCriteria = () => {
    setCriteriaForm({
      criteriaCode: "",
      description: "",
      isActive: true,
      sortOrder:
        Math.max(0, ...criteria.map((item) => item.sortOrder || 0)) + 1,
    });
    setCriteriaOpen(true);
  };

  const saveCriteria = async () => {
    setError(
      "Backend da chuyen acceptance criteria thanh du lieu rieng cua tung milestone. Khong con API tao criteria global.",
    );
    setCriteriaOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Catalog Management"
          description="Quan ly domain va skill dung cho job, staff specialization va ho so chuyen gia."
          actions={
            tab === "criteria" ? (
              <Button onClick={beginCreateCriteria}>
                <Plus className="h-4 w-4" /> Create criteria
              </Button>
            ) : (
              <Button
                onClick={tab === "domains" ? beginCreate : beginCreateSkill}
              >
                <Plus className="h-4 w-4" />{" "}
                {tab === "domains" ? "Create domain" : "Create skill"}
              </Button>
            )
          }
        />
      </div>
      <Card className="flex flex-wrap gap-2 p-3">
        <Button
          variant={tab === "domains" ? "primary" : "secondary"}
          onClick={() => setTab("domains")}
        >
          Domains
        </Button>
        <Button
          variant={tab === "skills" ? "primary" : "secondary"}
          onClick={() => setTab("skills")}
        >
          Skills
        </Button>
        <Button
          variant={tab === "criteria" ? "primary" : "secondary"}
          onClick={() => setTab("criteria")}
        >
          Acceptance criteria
        </Button>
      </Card>
      {error && (
        <Notice tone="danger" title="Khong tai duoc catalog">
          {error}
        </Notice>
      )}
      {tab === "domains" && (
        <Card className="overflow-hidden">
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[220px_minmax(0,1fr)_170px_170px_110px]">
            <span>Code</span>
            <span>Description</span>
            <span className="text-center">Created</span>
            <span className="text-center">Updated</span>
            <span>Actions</span>
          </div>
          {loading && (
            <div className="px-5 py-6 text-sm font-bold text-slate-500">
              Dang tai domain...
            </div>
          )}
          {!loading && sortedDomains.length === 0 && (
            <div className="px-5 py-8 text-sm font-bold text-slate-500">
              Chua co domain.
            </div>
          )}
          {!loading &&
            sortedDomains.map((domain) => (
              <div
                key={domain.domainId}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-left text-sm md:grid-cols-[220px_minmax(0,1fr)_170px_170px_110px] md:items-start"
              >
                <span className="font-mono text-xs font-bold text-brand-700">
                  {domain.domainCode}
                </span>
                <div>
                  <p className="font-extrabold text-ink">{domain.domainName}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {domain.description || "Chua co mo ta"}
                  </p>
                </div>
                <DateTimeCell value={domain.createdAt} />
                <DateTimeCell value={domain.updatedAt} />
                <div className="flex flex-wrap justify-start gap-2">
                  <Button variant="secondary" onClick={() => beginEdit(domain)}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
        </Card>
      )}
      {tab === "skills" && (
        <Card className="overflow-hidden">
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[220px_minmax(0,1fr)_170px_170px_110px]">
            <span>Code</span>
            <span>Description</span>
            <span className="text-center">Created</span>
            <span className="text-center">Updated</span>
            <span>Actions</span>
          </div>
          {loading && (
            <div className="px-5 py-6 text-sm font-bold text-slate-500">
              Dang tai skill...
            </div>
          )}
          {!loading && sortedSkills.length === 0 && (
            <div className="px-5 py-8 text-sm font-bold text-slate-500">
              Chua co skill.
            </div>
          )}
          {!loading &&
            sortedSkills.map((skill) => (
              <div
                key={skill.skillId}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-left text-sm md:grid-cols-[220px_minmax(0,1fr)_170px_170px_110px] md:items-start"
              >
                <span className="font-mono text-xs font-bold text-brand-700">
                  {skill.skillCode}
                </span>
                <div>
                  <p className="font-extrabold text-ink">{skill.skillName}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {skill.description || "Chua co mo ta"}
                  </p>
                </div>
                <DateTimeCell value={skill.createdAt} />
                <DateTimeCell value={skill.updatedAt} />
                <div className="flex flex-wrap justify-start gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => beginEditSkill(skill)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
        </Card>
      )}
      {tab === "criteria" && (
        <Card className="overflow-hidden">
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[220px_minmax(0,1fr)_160px_170px_170px]">
            <span>Code</span>
            <span>Description</span>
            <span>Status</span>
            <span className="text-center">Created</span>
            <span className="text-center">Updated</span>
          </div>
          {loading && (
            <div className="px-5 py-6 text-sm font-bold text-slate-500">
              Dang tai acceptance criteria...
            </div>
          )}
          {!loading && sortedCriteria.length === 0 && (
            <div className="px-5 py-8 text-sm font-bold text-slate-500">
              Chua co acceptance criteria.
            </div>
          )}
          {!loading &&
            sortedCriteria.map((item) => (
              <div
                key={item.criteriaId}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-left text-sm md:grid-cols-[220px_minmax(0,1fr)_160px_170px_170px] md:items-start"
              >
                <span className="font-mono text-xs font-bold text-brand-700">
                  {item.criteriaCode}
                </span>
                <p className="text-sm font-semibold leading-6 text-slate-600">
                  {item.description}
                </p>
                <div className="flex justify-start">
                  <Badge tone={item.isActive ? "mint" : "rose"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <DateTimeCell value={item.createdAt} />
                <DateTimeCell value={item.updatedAt} />
              </div>
            ))}
        </Card>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Update domain" : "Create domain"}
        description="Domain code se duoc backend chuan hoa thanh chu in hoa va dau gach duoi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDomain}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Domain code">
            <Input
              value={form.domainCode}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  domainCode: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Domain name">
            <Input
              value={form.domainName}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  domainName: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  description: event.target.value,
                }))
              }
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            />
          </Field>
        </div>
      </Modal>
      <Modal
        open={skillOpen}
        onClose={() => setSkillOpen(false)}
        title={editingSkill ? "Update skill" : "Create skill"}
        description="Skill code se duoc backend chuan hoa thanh chu in hoa va dau gach duoi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSkillOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSkill}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Skill code">
            <Input
              value={skillForm.skillCode}
              onChange={(event) =>
                setSkillForm((value) => ({
                  ...value,
                  skillCode: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Skill name">
            <Input
              value={skillForm.skillName}
              onChange={(event) =>
                setSkillForm((value) => ({
                  ...value,
                  skillName: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              value={skillForm.description}
              onChange={(event) =>
                setSkillForm((value) => ({
                  ...value,
                  description: event.target.value,
                }))
              }
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            />
          </Field>
        </div>
      </Modal>
      <Modal
        open={criteriaOpen}
        onClose={() => setCriteriaOpen(false)}
        title="Create acceptance criteria"
        description="Criteria code se duoc backend chuan hoa thanh chu in hoa va dau gach duoi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCriteriaOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCriteria}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Criteria code">
            <Input
              value={criteriaForm.criteriaCode}
              onChange={(event) =>
                setCriteriaForm((value) => ({
                  ...value,
                  criteriaCode: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Status">
            <select
              value={criteriaForm.isActive ? "active" : "inactive"}
              onChange={(event) =>
                setCriteriaForm((value) => ({
                  ...value,
                  isActive: event.target.value === "active",
                }))
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              value={criteriaForm.description}
              onChange={(event) =>
                setCriteriaForm((value) => ({
                  ...value,
                  description: event.target.value,
                }))
              }
              rows={5}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
