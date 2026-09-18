import type { FlowFile } from "@/lib/gen/flow";
import type { LocateProfile, TargetMatch } from "@/lib/targets";
import type { TemplateStep } from "@/lib/template";

/** 把编辑器当前模板编成引擎/壳使用的 FlowFile（docs/FLOW-FORMAT.md）。 */
export function toFlowFile(input: {
  id?: string;
  name?: string;
  keymapProfileId: string;
  match: TargetMatch;
  locate: LocateProfile;
  steps: TemplateStep[];
}): FlowFile {
  return {
    schemaVersion: 2,
    id: input.id ?? "session-template",
    name: input.name ?? "当前模板",
    keymapProfileId: input.keymapProfileId,
    target: {
      match: {
        exe: input.match.exe,
        title: input.match.title,
        className: input.match.className,
      },
      locate: {
        channel: input.locate.channel,
        source: input.locate.source,
        capture: input.locate.capture,
        visionPack: input.locate.visionPack,
      },
    },
    steps: input.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      type: step.type,
      label: step.label,
      mappingId: step.mappingId,
      profileId: step.profileId,
      keys: step.keys,
      config: step.config,
      disabled: step.disabled,
    })),
  };
}
