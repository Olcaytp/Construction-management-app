/**
 * Copyright © 2026 Olcaytp. All rights reserved.
 * This file is part of the Construction Management Application.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-6 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          <div className="text-center sm:text-left">
            <p>© {currentYear} Olcaytp. {t("app.allRightsReserved") || "Tüm hakları saklıdır."}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {t("app.licenseInfo") || "MIT Lisansı altında lisanslanmıştır."}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-500">
              {t("app.appName") || "Construction Management App"} v0.0.0
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
