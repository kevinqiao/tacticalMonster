export const findMerchant = async ({ merchantId, accessToken }: { merchantId: string; accessToken: string }) => {
    const CLOVER_URL = "https://apisandbox.dev.clover.com/v3/merchants/" + merchantId;
    const res = await fetch(CLOVER_URL, {
        method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // 将 token 添加到请求头中
            mode: "cors",
        },
    });
    const json = await res.json();
    return json;
}
export const findEmployee = async ({ merchantId, employeeId, accessToken }: { merchantId: string; employeeId: string; accessToken: string }) => {
    const CLOVER_URL = "https://apisandbox.dev.clover.com/v3/merchants/" + merchantId + "/employees/" + employeeId;
    const res = await fetch(CLOVER_URL, {
        method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // 将 token 添加到请求头中
            mode: "cors",
        },
    });
    const json = await res.json();
    return json;
}
export const findDevices = async ({ merchantId, accessToken }: { merchantId: string; accessToken: string }) => {
    const CLOVER_URL = "https://apisandbox.dev.clover.com/v3/merchants/" + merchantId
    const res = await fetch(CLOVER_URL + "/devices", {
        method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // 将 token 添加到请求头中
            mode: "cors",
        },
    });
    const json = await res.json();
    return json;
}
export const findOrders = async ({ merchantId, deviceId, accessToken }: { merchantId: string; deviceId: string; accessToken: string }) => {
    const CLOVER_URL = "https://apisandbox.dev.clover.com/v3/merchants/" + merchantId
    const res = await fetch(CLOVER_URL + "/orders?filter=device.id=" + deviceId, {
        method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // 将 token 添加到请求头中
            mode: "cors",
        },
    });
    const json = await res.json();
    return json;
}
export const findEmployeeOrders = async ({ url, accessToken }: { url: string; accessToken: string }) => {

    const res = await fetch(url + "?limit=100", {
        method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // 将 token 添加到请求头中
        },
    });
    const json = await res.json();
    return json;
}
export const findDeviceOrders = async ({ deviceId, merchantId, accessToken }: { deviceId: string; merchantId: string; accessToken: string }) => {
    const url = "https://sandbox.dev.clover.com/v3/merchants/" + merchantId + "/orders";
    const res = await fetch(url, {
        method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // 将 token 添加到请求头中
        },
    });
    const json = await res.json();
    return json;
}
export const findOrder = async ({ orderId, merchantId, accessToken }: { orderId: string; merchantId: string; accessToken: string }) => {
    const url = "https://sandbox.dev.clover.com/v3/merchants/" + merchantId + "/orders/" + orderId;
    const res = await fetch(url, {
        method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // 将 token 添加到请求头中
        },
    });
    const json = await res.json();
    return json;
}
