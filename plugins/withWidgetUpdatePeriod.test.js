const {
  MIN_UPDATE_PERIOD_MS,
  setUpdatePeriod,
} = require("./withWidgetUpdatePeriod");

const XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
  android:minWidth="110dp"
  android:updatePeriodMillis="0"
  android:widgetCategory="home_screen" />
`;

describe("withWidgetUpdatePeriod", () => {
  it("troca o período de atualização do widget", () => {
    const next = setUpdatePeriod(XML, MIN_UPDATE_PERIOD_MS);
    expect(next).toContain('android:updatePeriodMillis="1800000"');
    expect(next).not.toContain('android:updatePeriodMillis="0"');
  });

  it("adiciona o atributo quando ele não existe", () => {
    const xml = XML.replace('  android:updatePeriodMillis="0"\n', "");
    expect(setUpdatePeriod(xml, 1800000)).toContain(
      'android:updatePeriodMillis="1800000"',
    );
  });

  it("não mexe em XML que não é de widget", () => {
    const other = "<resources />";
    expect(setUpdatePeriod(other, 1800000)).toBe(other);
  });
});
