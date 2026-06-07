(function () {
  "use strict";

  // Thin wrapper over the Better Auth REST endpoints (mounted at /api/auth/*).
  // Cookies are sent automatically for same-origin requests, so the session is
  // tracked server-side. `user` is a live reference controllers can bind to.
  angular.module("app").factory("authService", [
    "$http",
    function ($http: angular.IHttpService): App.AuthService {
      var service: App.AuthService = {
        user: null,

        loadSession: function () {
          return $http.get("/api/auth/get-session").then(
            function (response) {
              var data = response.data as { user?: App.AuthUser } | null;
              service.user =
                data && data.user
                  ? {
                      id: data.user.id,
                      name: data.user.name,
                      email: data.user.email,
                    }
                  : null;
              return service.user;
            },
            function () {
              service.user = null;
              return null;
            }
          );
        },

        signUp: function (name, email, password) {
          return $http
            .post("/api/auth/sign-up/email", {
              name: name,
              email: email,
              password: password,
            })
            .then(function () {
              return service.loadSession();
            });
        },

        signIn: function (email, password) {
          return $http
            .post("/api/auth/sign-in/email", {
              email: email,
              password: password,
            })
            .then(function () {
              return service.loadSession();
            });
        },

        signOut: function () {
          return $http.post("/api/auth/sign-out", {}).then(function () {
            service.user = null;
          });
        },
      };

      return service;
    },
  ]);
})();
