/*
 * Config plugin: faz o Android pedir para o widget se redesenhar periodicamente.
 *
 * O expo-widgets gera o appwidget-provider com updatePeriodMillis="0" (nunca). Sem o
 * app aberto, o widget ficaria com os focos de ontem depois da meia-noite. Com uma
 * atualização periódica, o sistema redesenha o widget, que compara `focusDay` com a
 * data de hoje e zera o contador (ver widgets/FokusWidget.android.jsx).
 *
 * O Android não aceita menos que 30 min e não acorda o aparelho para isso: entrega
 * a atualização quando a tela liga.
 *
 * Roda depois do expo-widgets (chama o próximo mod antes de editar), então funciona em
 * qualquer posição na lista de plugins do app.json.
 */
const fs = require("fs");
const path = require("path");
const { withBaseMod } = require("expo/config-plugins");

const MIN_UPDATE_PERIOD_MS = 30 * 60 * 1000;

// Troca o updatePeriodMillis de um XML de appwidget-provider
const setUpdatePeriod = (xml, periodMs) => {
  if (!xml.includes("<appwidget-provider")) {
    return xml;
  }
  const value = `android:updatePeriodMillis="${periodMs}"`;
  return /android:updatePeriodMillis="[^"]*"/.test(xml)
    ? xml.replace(/android:updatePeriodMillis="[^"]*"/, value)
    : xml.replace("<appwidget-provider", `<appwidget-provider\n  ${value}`);
};

const withWidgetUpdatePeriod = (
  config,
  { updatePeriodMillis = MIN_UPDATE_PERIOD_MS } = {},
) => {
  const periodMs = Math.max(MIN_UPDATE_PERIOD_MS, updatePeriodMillis);
  return withBaseMod(config, {
    platform: "android",
    mod: "dangerous",
    isProvider: false,
    async action({ modRequest: { nextMod, ...modRequest }, ...rest }) {
      // Deixa o expo-widgets gerar os arquivos primeiro
      const results = await nextMod({ ...rest, modRequest });
      const xmlDirectory = path.join(
        modRequest.platformProjectRoot,
        "app/src/main/res/xml",
      );
      if (fs.existsSync(xmlDirectory)) {
        for (const file of fs.readdirSync(xmlDirectory)) {
          if (!file.endsWith("_info.xml")) {
            continue;
          }
          const filePath = path.join(xmlDirectory, file);
          const xml = fs.readFileSync(filePath, "utf8");
          const next = setUpdatePeriod(xml, periodMs);
          if (next !== xml) {
            fs.writeFileSync(filePath, next);
          }
        }
      }
      return results;
    },
  });
};

module.exports = withWidgetUpdatePeriod;
module.exports.setUpdatePeriod = setUpdatePeriod;
module.exports.MIN_UPDATE_PERIOD_MS = MIN_UPDATE_PERIOD_MS;
