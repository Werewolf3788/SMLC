=== SMLC Connect ===
Contributors: smlc
Tags: smlc, clay county, directory, divi
Requires at least: 5.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Shows the Support My Local Community pages inside WordPress (works with Divi). GitHub stays the master copy.

== Installation ==
1. Plugins > Add New > Upload Plugin > choose smlc-connect.zip > Install Now > Activate.
2. Settings > SMLC Connect: check the GitHub address (test copy: https://werewolf3788.github.io/SMLC/).
3. For each SMLC page: Pages > Add New, set the title/address, add a Shortcode block (or a Divi Code module) with [smlc page="flora"], Publish.
   Page names: home, flora, louisville, clay-city, sailor-springs, xenia, directory, gallery, gas, share-photos, install.
4. Home page: Settings > Reading > "A static page" > Homepage = the page with [smlc page="home"].
5. Settings > Permalinks: "Post name" is recommended (addresses like /flora/).

== What it does ==
* Each [smlc page="..."] page shows the full SMLC page (its own design, not the Divi header/footer).
* Pages refresh from GitHub every 60 minutes (Settings > SMLC Connect > "Refresh now" for immediate updates). If GitHub is down, the last good copy is shown.
* Links between SMLC pages go to the WordPress pages; the canonical (search engine) address is the WordPress page.
* SMLC app: installable + offline mode from the WordPress site's own address.
* Premium business offer pop-up on the rest of the WordPress site (optional).
