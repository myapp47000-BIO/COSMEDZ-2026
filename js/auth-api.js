/* ============================================================
   COSMADEDZ — Auth API client
   Talks to server/server.py (same origin by default).
   ============================================================ */
(function () {
  "use strict";

  var BASE = (window.COSD_API_BASE || "").replace(/\/+$/, "");

  function ApiError(status, data) {
    this.name = "ApiError";
    this.status = status || 0;
    this.code = (data && (data.error || data.code)) || "request_failed";
    this.message = (data && data.message) || "تعذر إكمال الطلب.";
    this.data = data || null;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function request(path, options) {
    options = options || {};
    var headers = Object.assign({ "Accept": "application/json" }, options.headers || {});
    if (options.token) headers["Authorization"] = "Bearer " + options.token;

    var init = {
      method: options.method || "GET",
      headers: headers,
      credentials: "same-origin",
      cache: "no-store"
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    return fetch(BASE + path, init).then(function (response) {
      return response.text().then(function (text) {
        var data = null;
        if (text) {
          try { data = JSON.parse(text); }
          catch (e) { data = { ok: false, error: "invalid_response", message: text.slice(0, 300) }; }
        }
        if (!response.ok) throw new ApiError(response.status, data);
        return data || {};
      });
    }).catch(function (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, {
        error: "network_error",
        message: "تعذر الاتصال بالخادم. تأكد من تشغيله: python server/server.py"
      });
    });
  }

  window.COSD_AUTH = {
    base: BASE,
    ApiError: ApiError,

    health: function () {
      return request("/api/health");
    },

    requestAccess: function (body) {
      return request("/api/auth/request", { method: "POST", body: body });
    },

    activate: function (body) {
      return request("/api/auth/activate", { method: "POST", body: body });
    },

    resend: function (email) {
      return request("/api/auth/resend", { method: "POST", body: { email: email } });
    },

    adminLogin: function (body) {
      return request("/api/auth/admin-login", { method: "POST", body: body });
    },

    me: function (token) {
      return request("/api/auth/me", { token: token });
    },

    logout: function (token) {
      return request("/api/auth/logout", { method: "POST", token: token });
    },

    adminRequests: function (token) {
      return request("/api/admin/requests", { token: token });
    },

    approve: function (token, id) {
      return request("/api/admin/requests/" + encodeURIComponent(id) + "/approve", { method: "POST", token: token });
    },

    reject: function (token, id) {
      return request("/api/admin/requests/" + encodeURIComponent(id) + "/reject", { method: "POST", token: token });
    },

    issueCode: function (token, id) {
      return request("/api/admin/requests/" + encodeURIComponent(id) + "/code", { method: "POST", token: token });
    }
  };
})();
