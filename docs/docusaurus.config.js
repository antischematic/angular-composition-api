const lightCodeTheme = require("prism-react-renderer/themes/github")
const darkCodeTheme = require("prism-react-renderer/themes/dracula")

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
;(
   module.exports = {
      title: "Angular Composition API",
      tagline: "Composition model for reactive Angular applications",
      url: "https://mmuscat.github.io",
      baseUrl: "/angular-composition-api/",
      onBrokenLinks: "throw",
      onBrokenMarkdownLinks: "warn",
      favicon: "img/favicon.ico",
      organizationName: "mmuscat", // Usually your GitHub org/user name.
      projectName: "angular-composition-api", // Usually your repo name.
      trailingSlash: false,
      presets: [
         [
            "@docusaurus/preset-classic",
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
               docs: {
                  sidebarPath: require.resolve("./sidebars.js"),
                  // Please change this to your repo.
                  editUrl:
                     "https://github.com/mmuscat/angular-composition-api/tree/master",
               },
               theme: {
                  customCss: require.resolve("./src/css/custom.css"),
               },
            }),
         ],
      ],

      themeConfig:
         /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
         ({
            navbar: {
               title: "Angular Composition API",
               items: [
                  {
                     type: "doc",
                     docId: "intro",
                     position: "left",
                     label: "Guide",
                  },
                  {
                     href: "https://github.com/mmuscat/angular-composition-api",
                     label: "GitHub",
                     position: "right",
                  },
               ],
            },
            footer: {
               style: "dark",
               links: [
                  {
                     title: "Docs",
                     items: [
                        {
                           label: "Guide",
                           to: "/docs/intro",
                        },
                     ],
                  },
                  {
                     title: "More",
                     items: [
                        {
                           label: "GitHub",
                           href: "https://github.com/mmuscat/angular-composition-api",
                        },
                     ],
                  },
               ],
               copyright: `Copyright © ${new Date().getFullYear()} Michael Muscat. All rights reserved. Built with Docusaurus.`,
            },
            prism: {
               theme: lightCodeTheme,
               darkTheme: darkCodeTheme,
            },
         }),
   }
)
