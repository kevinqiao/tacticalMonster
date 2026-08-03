import fs from "fs";

const path =
  "c:/selfhome/development/projects/tacticalMonster/src/component/lobby/campaign/merchant/MerchantCampaignListPage.tsx";
let t = fs.readFileSync(path, "utf8");

// File was accidentally double-spaced in large regions.
t = t.replace(/\n\n+/g, "\n");

t = t.replace(
  /import \{ usePartnerGameOptions \} from "\.\/usePartnerGameOptions";/,
  'import { useCampaignTournamentOptions } from "./useCampaignTournamentOptions";'
);
t = t.replace(
  /import \{ useCampaignTournamentOptions \} from "\.\/useCampaignTournamentOptions";/,
  'import { useCampaignTournamentOptions } from "./useCampaignTournamentOptions";'
);

t = t.replace(/PORTAL_GAME_OPTIONS,\s*/g, "");
t = t.replace(/portalTemplateLabel,\s*/g, "");

const oldProps = `  gameOptions?: ReadonlyArray<{ value: string; label: string }>;
  gamesLoading?: boolean;
}> = ({
  form,
  couponDefs,
  portalVoucherSkus = [],
  onChange,
  disabled,
  structuralLocked,
  experienceTypeLocked,
  posterPortraitPreview,
  posterLandscapePreview,
  onPosterPortraitSelect,
  onPosterLandscapeSelect,
  gameOptions = PORTAL_GAME_OPTIONS,
  gamesLoading = false,
}) => {`;

const newProps = `  tournamentOptions?: ReadonlyArray<{
    tournamentId: string;
    label: string;
    gameType: string;
    mode: "solo" | "multi";
  }>;
}> = ({
  form,
  couponDefs,
  portalVoucherSkus = [],
  onChange,
  disabled,
  structuralLocked,
  experienceTypeLocked,
  posterPortraitPreview,
  posterLandscapePreview,
  onPosterPortraitSelect,
  onPosterLandscapeSelect,
  tournamentOptions = [],
}) => {`;

// After removing PORTAL_GAME_OPTIONS import, default may already be broken
const oldProps2 = oldProps.replace(
  "gameOptions = PORTAL_GAME_OPTIONS",
  "gameOptions = []"
);

if (t.includes(oldProps)) {
  t = t.replace(oldProps, newProps);
  console.log("props ok");
} else if (t.includes(oldProps2)) {
  t = t.replace(oldProps2, newProps);
  console.log("props2 ok");
} else {
  console.log("oldProps not found");
  const i = t.indexOf("gamesLoading");
  console.log(JSON.stringify(t.slice(i - 120, i + 200)));
}

const oldEffect = `  useEffect(() => {
    if (gamesLoading || !gameOptions.length) return;
    if (gameOptions.some((g) => g.value === form.gameType)) return;
    onChange({ gameType: gameOptions[0]!.value });
  }, [gameOptions, gamesLoading, form.gameType, onChange]);`;

const newEffect = `  useEffect(() => {
    if (!tournamentOptions.length) return;
    if (tournamentOptions.some((g) => g.tournamentId === form.tournamentId)) return;
    const first = tournamentOptions[0]!;
    onChange(
      normalizeFormForRewardModel({
        ...form,
        tournamentId: first.tournamentId,
        gameType: first.gameType,
        mode: first.mode,
      })
    );
  }, [tournamentOptions, form.tournamentId, onChange]);`;

if (t.includes(oldEffect)) {
  t = t.replace(oldEffect, newEffect);
  console.log("effect ok");
} else console.log("oldEffect not found");

const oldSelect = `      <h3 className="merchant-section-title">{t("form.gameSection")}</h3>
      <label className="merchant-field">
        {t("form.game")}
        <select
          value={form.gameType}
          disabled={lock || gamesLoading}
          onChange={(e) => onChange({ gameType: e.target.value })}
        >
          {gameOptions.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <label className="merchant-field">
        {t("form.playMode")}
        <select
          value={form.mode}
          disabled={lock}
          onChange={(e) =>
            onChange(
              normalizeFormForRewardModel({
                ...form,
                mode: e.target.value as CampaignFormState["mode"],
              })
            )
          }
        >
          <option value="solo">{t("form.modeSolo")}</option>
          <option value="multi">{t("form.modeMulti")}</option>
        </select>
      </label>
      <p className="merchant-note">
        {t("form.portalTemplate")}{" "}
        <code>{portalTemplateLabel(form.mode, form.gameType)}</code>
      </p>`;

const newSelect = `      <h3 className="merchant-section-title">{t("form.gameSection")}</h3>
      <label className="merchant-field">
        {t("form.tournament", { defaultValue: "Tournament desk" })}
        <select
          value={form.tournamentId}
          disabled={lock}
          onChange={(e) => {
            const opt = tournamentOptions.find((o) => o.tournamentId === e.target.value);
            if (!opt) return;
            onChange(
              normalizeFormForRewardModel({
                ...form,
                tournamentId: opt.tournamentId,
                gameType: opt.gameType,
                mode: opt.mode,
              })
            );
          }}
        >
          {tournamentOptions.map((g) => (
            <option key={g.tournamentId} value={g.tournamentId}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <p className="merchant-note">
        <code>{form.tournamentId}</code>
        {" · "}
        {form.mode === "solo" ? t("form.modeSolo") : t("form.modeMulti")}
      </p>`;

if (t.includes(oldSelect)) {
  t = t.replace(oldSelect, newSelect);
  console.log("select ok");
} else {
  console.log("oldSelect not found");
}

t = t.replace(
  /const \{ options: partnerGameOptions, loading: partnerGamesLoading \} = usePartnerGameOptions\(\s*partnerId \|\| null\s*\);\s*\n\s*const gameOptions = partnerGameOptions && partnerGameOptions\.length > 0 \? partnerGameOptions : \[\.\.\.PORTAL_GAME_OPTIONS\];/,
  "const { options: tournamentOptions } = useCampaignTournamentOptions();"
);

t = t.replace(
  /const \{ options: partnerGameOptions, loading: partnerGamesLoading \} = useCampaignTournamentOptions\([\s\S]*?\);\s*\n\s*const gameOptions =[\s\S]*?;/,
  "const { options: tournamentOptions } = useCampaignTournamentOptions();"
);

t = t.replace(
  /const \{ options: tournamentOptions \} = useCampaignTournamentOptions\(\);\s*\n\s*const gameOptions =[\s\S]*?;/,
  "const { options: tournamentOptions } = useCampaignTournamentOptions();"
);

if (!t.includes("const { options: tournamentOptions } = useCampaignTournamentOptions()")) {
  t = t.replace(
    /const \{ options:[\s\S]{0,80}?\} = useCampaignTournamentOptions\([\s\S]{0,80}?\);\s*\n\s*const gameOptions[\s\S]{0,200}?;/,
    "const { options: tournamentOptions } = useCampaignTournamentOptions();"
  );
}

// If hook call still missing entirely
if (!t.includes("useCampaignTournamentOptions()")) {
  t = t.replace(
    /const \[partnerSlug, setPartnerSlug\] = useState\(""\);/,
    `const [partnerSlug, setPartnerSlug] = useState("");\n  const { options: tournamentOptions } = useCampaignTournamentOptions();`
  );
}

t = t.replace(/gameOptions=\{gameOptions\}/g, "tournamentOptions={tournamentOptions}");
t = t.replace(/\s*gamesLoading=\{partnerGamesLoading\}/g, "");
t = t.replace(
  /gameType: normalized\.gameType,\s*\n\s*mode: normalized\.mode,/g,
  "tournamentId: normalized.tournamentId,"
);

fs.writeFileSync(path, t);
console.log("done");
console.log({
  tournamentHook: t.includes("useCampaignTournamentOptions()"),
  oldGameSelect: t.includes('value={form.gameType}'),
  tournamentSelect: t.includes("form.tournamentId"),
  partnerGame: t.includes("partnerGameOptions"),
  portalTemplateLabel: t.includes("portalTemplateLabel"),
  PORTAL_GAME: t.includes("PORTAL_GAME_OPTIONS"),
});
