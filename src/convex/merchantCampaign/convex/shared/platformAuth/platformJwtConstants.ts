/** Shared platform JWT constants — keep in sync with src/convex/shared/platformAuth/platformJwtConstants.ts */

export const PLATFORM_JWT_ISSUER = "https://platform.tacticalmonster.dev";
export const PLATFORM_JWT_AUDIENCE = "convex";
export const PLATFORM_JWT_KID = "platform-dev";
export const PLATFORM_JWT_TTL_SEC = 7 * 24 * 60 * 60;

export const PLATFORM_JWT_PRIVATE_KEY_DEV = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1ABqkGrzf2DkS
g2b7vg34Mk5HSpW5m/+Vkic8okkERRnJ/ub7aswAaeWwomP4ydlotHp+hLd3EF3N
NpVnzYNn9DgSoYqp3o53Pxb+Ka4SzGTtw+SHjLhYaseNU4E0bjveZUrnDWmUFsIu
98c3DUOCP+dcx2skfbRg9qlIdYwqNkIbQad58cZkllirtw2dKghLV2gVCpuRzxM8
4PwqVNgeJIsJLpOpoiMVAD5LnsssMXzyI5oGNHrFkIfZTCrU7YePOLXYKTnjYi65
whQJX/wrz7BVuYIWYJUsDrb9UdDho6lwXeh6g8+KvYyPboM5Up1yNlH7Ml1XufK8
MKmjoF+5AgMBAAECggEACuBt+WkS6wepDFQBowSdfcn2GsIgY7Y8Yl5VRcdByIQn
g9QxyK93AVpbv2TOyaNFkY1w4/vxM3I0FNIgIcv/hsZt/S6gcMtLN96+cLkL+Ry3
vvL732plJIkMI1G+jKpIJjnjiaVscAX7Fsv0eHovUZsp+dEQ/vEf3wjLjOtlaB7f
DHeuqv2QmoPYh/3FtsJn0nU4vuCmGHEWhjMiJnYRDV+u0DcwyXfEi1tz0Lv0fl4X
hNqG9xPp5Vq93pgtxSikcCxa7PQ222vzVBtTkdB3mO60+rpOvg2+FzD97ny1++Ja
Wk+EAC+6i9q8noExhitkpU9tmajty+9S57LsqzYIIQKBgQDwTZHwoo44X3klLw+F
oCha0X5OBWVieTumeuHf5Vi99CScLGmtvIqw6U3kJeOPxDMbDLA8J7xML+M16M4Q
/ndQ3cebV9b7nbuZ7+qU3KG0oczKABkVhUDcYhc8aEZXEto/2rYywHyCXJpiqwwV
YtNvhtCXz90Ara66JhILNR03aQKBgQDA0tr7QzbseynoAyB9RuQ5y31WDYomnOUS
SWehKbfMhXHCHTQec99trWUmNrZTY0Z+skYOBYtgPwS4DedNN6GlW3jMzU8N2hUa
duMjHuUoQ0Bh7TZfcfjS+S+3Eb6o6bFMB6W0/524ft6aWUXf2L6q06ZpWRPoAhEl
kkd7b0ur0QKBgQC02QweV5hFIMUhkNtTq4bzYnp16WW1yJt13UEkqYwx2Q28Y0hd
MmoGXm76ZvFt/zCfCNuRSi5SADA1IDIFZB0TxPU2GdN3pevMHF0lDy67rJFc7Nnz
8kcwFLp8AdX+LfgG2mkIpQiPa3XdD/GWHrwVURanSg5/NjcrbP9jY+PLEQKBgDE0
nZUI7fci5urCAYR2lr744p8XDW4VE4+7E6rYzoJuez0h3q72usluOiWqSJS2/MJQ
E/h4Cb0h175wLdpSm/lqgkUhD09lm4UJWaUYuTmxD7jto7ZviyOrWzXIXXMVT50r
RmoN4N234m5Y4a/hy6YkJI81oBLQlDeWQI+LMzBBAoGAQXXLteC4nVcniDrPcpar
Ky21nwwddXd3vl7sZbW9xASmMhVW23e+GFL43BkD8oinhJuvYpEG6JhfsxhBWLwk
aiTF9Iax8HbU/cNLxdOCrxZ6Wf9NHG0XrEBn6Se1QX7Cr5zHlheltZJD8cbMM5gv
DiACVeyeKVOY1zGP5FliFE4=
-----END PRIVATE KEY-----`;

export const PLATFORM_JWKS_DEV_JSON = JSON.stringify({
  keys: [
    {
      kty: "RSA",
      n: "tQAapBq839g5EoNm-74N-DJOR0qVuZv_lZInPKJJBEUZyf7m-2rMAGnlsKJj-MnZaLR6foS3dxBdzTaVZ82DZ_Q4EqGKqd6Odz8W_imuEsxk7cPkh4y4WGrHjVOBNG473mVK5w1plBbCLvfHNw1Dgj_nXMdrJH20YPapSHWMKjZCG0GnefHGZJZYq7cNnSoIS1doFQqbkc8TPOD8KlTYHiSLCS6TqaIjFQA-S57LLDF88iOaBjR6xZCH2Uwq1O2Hjzi12Ck542IuucIUCV_8K8-wVbmCFmCVLA62_VHQ4aOpcF3oeoPPir2Mj26DOVKdcjZR-zJdV7nyvDCpo6BfuQ",
      e: "AQAB",
      use: "sig",
      kid: "platform-dev",
      alg: "RS256",
    },
  ],
});

function jwksDataUriFromJson(jwksJson: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(jwksJson, "utf8").toString("base64")
      : btoa(jwksJson);
  return `data:text/plain;charset=utf-8;base64,${b64}`;
}

export const PLATFORM_JWKS_DATA_URI = jwksDataUriFromJson(PLATFORM_JWKS_DEV_JSON);
