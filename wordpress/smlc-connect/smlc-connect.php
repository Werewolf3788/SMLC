<?php
/**
 * Plugin Name:       SMLC Connect
 * Plugin URI:        https://supportmylocalcommunity.com/
 * Description:       Shows the Support My Local Community pages (home, the five towns, business directory, gallery, gas prices, photo sharing, install) inside WordPress / Divi. Put [smlc page="flora"] on a page. GitHub stays the master copy; WordPress refreshes it automatically. Also adds the SMLC app (install + offline) and the business offer pop-up.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Support My Local Community
 * License:           GPL-2.0-or-later
 * Text Domain:       smlc-connect
 */

if (!defined('ABSPATH')) exit;

final class SMLC_Connect {
    const VERSION = '1.0.0';
    const OPT     = 'smlc_connect_settings';
    const MAP_OPT = 'smlc_connect_page_map';

    /** Shortcode name => file on GitHub */
    public static $pages = array(
        'home'           => 'index.html',
        'flora'          => 'flora.html',
        'louisville'     => 'louisville.html',
        'clay-city'      => 'clay-city.html',
        'sailor-springs' => 'sailor-springs.html',
        'xenia'          => 'xenia.html',
        'directory'      => 'directory.html',
        'gallery'        => 'gallery.html',
        'gas'            => 'update-gas.html',
        'share-photos'   => 'share-photos.html',
        'install'        => 'install.html',
    );

    public static function defaults() {
        return array(
            'source'          => 'https://werewolf3788.github.io/SMLC/',
            'cache_minutes'   => 60,
            'offers_everywhere' => 1,
            'app'             => 1,
            'keep_admin_bar'  => 0,
        );
    }
    public static function settings() {
        $s = wp_parse_args((array) get_option(self::OPT, array()), self::defaults());
        $s['source'] = trailingslashit(esc_url_raw(trim($s['source'])));
        $s['cache_minutes'] = max(1, (int) $s['cache_minutes']);
        return $s;
    }

    public static function init() {
        add_shortcode('smlc', array(__CLASS__, 'shortcode'));
        add_action('template_redirect', array(__CLASS__, 'maybe_render_page'), 1);
        add_action('init', array(__CLASS__, 'serve_app_files'), 1);
        add_action('save_post', array(__CLASS__, 'rebuild_page_map'));
        add_action('deleted_post', array(__CLASS__, 'rebuild_page_map'));
        add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_everywhere'));
        add_action('admin_menu', array(__CLASS__, 'admin_menu'));
        add_action('admin_init', array(__CLASS__, 'register_settings'));
        add_action('admin_post_smlc_refresh', array(__CLASS__, 'handle_refresh'));
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
            array_unshift($links, '<a href="' . esc_url(admin_url('options-general.php?page=smlc-connect')) . '">Settings</a>');
            return $links;
        });
    }

    /* ------------------------------------------------------------------ which page */

    /** "flora" from [smlc page="flora"] anywhere in the content (works inside Divi modules too) */
    public static function page_key_in($content) {
        if (preg_match('/\[smlc\s+[^\]]*page\s*=\s*["\']?([a-z\-]+)/i', (string) $content, $m)) {
            $k = strtolower($m[1]);
            return isset(self::$pages[$k]) ? $k : '';
        }
        return '';
    }

    /** file => WordPress URL, for every published page that holds [smlc page=...] */
    public static function page_map() {
        $map = get_option(self::MAP_OPT);
        if (!is_array($map)) $map = self::rebuild_page_map();
        return $map;
    }
    public static function rebuild_page_map($post_id = 0) {
        global $wpdb;
        $rows = $wpdb->get_results("SELECT ID, post_content FROM {$wpdb->posts} WHERE post_status = 'publish' AND post_type IN ('page','post') AND post_content LIKE '%[smlc %'");
        $map = array();
        foreach ((array) $rows as $r) {
            $k = self::page_key_in($r->post_content);
            if ($k && !isset($map[self::$pages[$k]])) $map[self::$pages[$k]] = get_permalink($r->ID);
        }
        update_option(self::MAP_OPT, $map, false);
        return $map;
    }

    /** In normal WordPress output (e.g. a Divi layout preview) the shortcode shows a short note */
    public static function shortcode($atts) {
        $atts = shortcode_atts(array('page' => ''), $atts, 'smlc');
        $k = strtolower($atts['page']);
        if (!isset(self::$pages[$k])) {
            return current_user_can('edit_posts') ? '<p><strong>SMLC Connect:</strong> unknown page "' . esc_html($k) . '". Use one of: ' . esc_html(implode(', ', array_keys(self::$pages))) . '.</p>' : '';
        }
        return '<p>This page shows the Support My Local Community ' . esc_html($k) . ' page. <a href="' . esc_url(get_permalink()) . '">Open it</a>.</p>';
    }

    /* ------------------------------------------------------------------ fetch + cache */

    public static function fetch_page($file, $force = false) {
        $s = self::settings();
        $url = $s['source'] . $file;
        $key = 'smlc_page_' . md5($url);
        if (!$force) {
            $cached = get_transient($key);
            if ($cached !== false) return $cached;
        }
        $res = wp_remote_get($url, array('timeout' => 20, 'headers' => array('Cache-Control' => 'no-cache')));
        $code = is_wp_error($res) ? 0 : (int) wp_remote_retrieve_response_code($res);
        $body = $code === 200 ? wp_remote_retrieve_body($res) : '';
        if ($body && stripos($body, '<body') !== false) {
            set_transient($key, $body, $s['cache_minutes'] * MINUTE_IN_SECONDS);
            update_option('smlc_backup_' . md5($url), $body, false);      // last good copy, used if GitHub is down
            return $body;
        }
        $backup = get_option('smlc_backup_' . md5($url));
        if ($backup) {
            set_transient($key, $backup, 5 * MINUTE_IN_SECONDS);
            return $backup;
        }
        return '';
    }

    public static function handle_refresh() {
        if (!current_user_can('manage_options')) wp_die('Not allowed');
        check_admin_referer('smlc_refresh');
        $s = self::settings();
        foreach (self::$pages as $file) delete_transient('smlc_page_' . md5($s['source'] . $file));
        self::rebuild_page_map();
        wp_safe_redirect(add_query_arg('smlc_refreshed', '1', admin_url('options-general.php?page=smlc-connect')));
        exit;
    }

    /* ------------------------------------------------------------------ rewrite */

    /** One URL from the SMLC page -> where it should point on this WordPress site */
    public static function rewrite_url($u, $base, $map) {
        $u = html_entity_decode($u, ENT_QUOTES);
        if ($u === '' || $u[0] === '#' || $u[0] === '$' || $u[0] === '{' || $u[0] === "'" || strpos($u, '${') !== false) return null;
        if (preg_match('#^(mailto:|tel:|data:|javascript:|blob:)#i', $u)) return null;
        $parts = preg_split('/(?=[?#])/', $u, 2);
        $path = $parts[0];
        $tail = isset($parts[1]) ? $parts[1] : '';
        // links to SMLC pages on GitHub or supportmylocalcommunity.com -> the WordPress page
        if (preg_match('#^(https?:)?//#i', $path)) {
            $host = strtolower((string) parse_url((strpos($path, '//') === 0 ? 'https:' : '') . $path, PHP_URL_HOST));
            if (!preg_match('/(^|\.)supportmylocalcommunity\.com$|github\.io$/', $host)) return null;
            $file = basename((string) parse_url($path, PHP_URL_PATH));
            if ($file === '' && preg_match('/supportmylocalcommunity\.com$/', $host)) $file = 'index.html';
            if ($file !== '' && strpos($file, '.') === false) $file .= '.html';     // /clay-city -> clay-city.html
            return isset($map[$file]) ? $map[$file] . $tail : null;
        }
        $file = basename($path);
        if (isset($map[$file]) && strpos($path, '/') === false) return $map[$file] . $tail;
        if (preg_match('#^\.?/?$#', $path)) return isset($map['index.html']) ? $map['index.html'] . $tail : null;
        return $base . ltrim(preg_replace('#^\./#', '', $path), '/') . $tail;   // scripts, styles, images, data -> GitHub
    }

    public static function transform($html, $file, $permalink) {
        $s = self::settings();
        $base = $s['source'];
        $map = self::page_map();
        $map[$file] = $permalink;

        $html_attrs = preg_match('/<html([^>]*)>/i', $html, $m) ? $m[1] : ' lang="en"';
        $head = preg_match('/<head[^>]*>(.*?)<\/head>/is', $html, $m) ? $m[1] : '';
        $body_attrs = preg_match('/<body([^>]*)>/i', $html, $m) ? $m[1] : '';
        $body = preg_match('/<body[^>]*>(.*)<\/body>/is', $html, $m) ? $m[1] : $html;

        $fix = function ($text) use ($base, $map) {
            return preg_replace_callback('/\b(src|href|action|poster|data-src)=("|\')([^"\'<>]*)\2/i', function ($m) use ($base, $map) {
                $new = SMLC_Connect::rewrite_url($m[3], $base, $map);
                return $new === null ? $m[0] : $m[1] . '=' . $m[2] . esc_attr($new) . $m[2];
            }, $text);
        };
        $head = $fix($head);
        $body = $fix($body);

        // This WordPress address is the official one for search engines
        $head = preg_replace('/<link[^>]+rel=["\']canonical["\'][^>]*>\s*/i', '', $head);
        $head = preg_replace('/(<meta[^>]+property=["\']og:url["\'][^>]+content=["\'])[^"\']*(["\'])/i', '${1}' . esc_url($permalink) . '${2}', $head);
        $head = '<link rel="canonical" href="' . esc_url($permalink) . '">' . "\n" . $head;

        return array('html_attrs' => $html_attrs, 'head' => $head, 'body_attrs' => $body_attrs, 'body' => $body, 'map' => $map);
    }

    /* ------------------------------------------------------------------ page output */

    /** Settings + link fixer that every SMLC page (and the offer pop-up) gets first */
    public static function prelude($map) {
        $s = self::settings();
        $cfg = array(
            'base'     => $s['source'],
            'pages'    => (object) $map,
            'sw'       => $s['app'] ? home_url('/?smlc_asset=sw') : '',
            'manifest' => $s['app'] ? home_url('/?smlc_asset=manifest') : '',
        );
        $js = 'window.SMLC_WP=' . wp_json_encode($cfg) . ';' . self::link_fixer_js();
        return '<script>' . $js . '</script>';
    }

    /** Fixes links/requests made later by the page's own scripts (menus from Firebase, directory links...) */
    public static function link_fixer_js() {
        return <<<'JS'
(function(){var W=window.SMLC_WP||{},B=W.base||'',P=W.pages||{};
function map(h){if(!h)return null;var t='',i=h.search(/[?#]/);if(i>=0){t=h.slice(i);h=h.slice(0,i);}
 var m=h.match(/^(?:https?:)?\/\/([^\/]+)(\/[^?#]*)?$/i),f;
 if(m){var host=m[1].toLowerCase();if(!/(^|\.)supportmylocalcommunity\.com$|github\.io$/.test(host))return null;f=(m[2]||'/').split('/').pop();if(!f&&/supportmylocalcommunity/.test(host))f='index.html';if(f&&f.indexOf('.')<0)f+='.html';}
 else if(/^[\w.-]+\.html$/i.test(h)){f=h;}else return null;
 return P[f]?P[f]+t:null;}
window.smlcWpLink=map;
function fix(a){var h=a.getAttribute('href'),n=map(h);if(n&&n!==h){a.setAttribute('href',n);if(a.target==='_blank'&&n.indexOf(location.origin)===0)a.removeAttribute('target');}}
function all(r){(r.querySelectorAll?r:document).querySelectorAll('a[href]').forEach(fix);if(r.tagName==='A')fix(r);}
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(a)fix(a);},true);
var go=function(){all(document);new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='attributes')fix(m.target);else m.addedNodes.forEach(function(n){if(n.nodeType===1)all(n);});});}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['href']});};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
var F=window.fetch;if(F)window.fetch=function(u,o){if(typeof u==='string'&&!/^([a-z]+:|\/)/i.test(u)&&!/^#/.test(u))u=B+u.replace(/^\.\//,'');return F.call(this,u,o);};
})();
JS;
    }

    public static function maybe_render_page() {
        if (is_admin() || !is_singular()) return;
        $post = get_queried_object();
        if (!$post || empty($post->post_content)) return;
        $key = self::page_key_in($post->post_content);
        if (!$key) return;
        if (isset($_GET['et_fb']) || isset($_GET['elementor-preview'])) return;    // leave the Divi visual builder alone

        $file = self::$pages[$key];
        $force = isset($_GET['smlc_refresh']) && current_user_can('edit_pages');
        $raw = self::fetch_page($file, $force);
        if (!$raw) return;   // GitHub unreachable and no saved copy: fall back to the normal WordPress page
        $t = self::transform($raw, $file, get_permalink($post));
        $s = self::settings();

        status_header(200);
        nocache_headers();
        header('Content-Type: text/html; charset=UTF-8');
        echo "<!DOCTYPE html>\n<html" . $t['html_attrs'] . ">\n<head>\n" . self::prelude($t['map']) . "\n" . $t['head'];
        if ($s['keep_admin_bar'] && is_admin_bar_showing()) { wp_head(); }
        echo "\n</head>\n<body" . $t['body_attrs'] . ">\n" . $t['body'];
        if ($s['keep_admin_bar'] && is_admin_bar_showing()) { wp_footer(); }
        echo "\n<!-- SMLC Connect " . esc_html(self::VERSION) . ': ' . esc_html($file) . " -->\n</body>\n</html>";
        exit;
    }

    /* ------------------------------------------------------------------ app files (same site) */

    public static function serve_app_files() {
        if (empty($_GET['smlc_asset'])) return;
        $s = self::settings();
        if (!$s['app']) return;
        $asset = sanitize_key($_GET['smlc_asset']);
        $map = self::page_map();
        if ($asset === 'sw') {
            $res = wp_remote_get($s['source'] . 'sw.js', array('timeout' => 15));
            $code = is_wp_error($res) ? '' : wp_remote_retrieve_body($res);
            $opt = 'smlc_backup_sw';
            if ($code && strpos($code, 'addEventListener') !== false) update_option($opt, $code, false); else $code = (string) get_option($opt, '');
            $core = array_values($map);
            header('Content-Type: application/javascript; charset=UTF-8');
            header('Service-Worker-Allowed: /');
            header('Cache-Control: no-cache');
            echo 'self.SMLC_CORE=' . wp_json_encode($core) . ';self.SMLC_ASSET_HOST=' . wp_json_encode($s['source']) . ";\n" . $code;
            exit;
        }
        if ($asset === 'manifest') {
            $icons = $s['source'] . 'icons/';
            $start = isset($map['index.html']) ? $map['index.html'] : home_url('/');
            $shortcuts = array();
            foreach (array('directory.html' => 'Business Directory', 'update-gas.html' => 'Gas Prices', 'flora.html' => 'Flora', 'louisville.html' => 'Louisville') as $f => $name) {
                if (isset($map[$f])) $shortcuts[] = array('name' => $name, 'url' => add_query_arg('source', 'app', $map[$f]), 'icons' => array(array('src' => $icons . 'icon-192.png', 'sizes' => '192x192')));
            }
            $manifest = array(
                'name' => 'Support My Local Community — Clay County, IL',
                'short_name' => 'SMLC',
                'description' => 'Clay County, Illinois events, news, gas prices, weather and the business directory — works even with no signal.',
                'id' => '/?smlc_app=1',
                'start_url' => add_query_arg('source', 'app', $start),
                'scope' => '/',
                'display' => 'standalone',
                'orientation' => 'portrait-primary',
                'background_color' => '#001B37',
                'theme_color' => '#001B37',
                'lang' => 'en-US',
                'icons' => array(
                    array('src' => $icons . 'icon-192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'),
                    array('src' => $icons . 'icon-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'),
                    array('src' => $icons . 'icon-maskable-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'),
                ),
                'shortcuts' => $shortcuts,
            );
            header('Content-Type: application/manifest+json; charset=UTF-8');
            header('Cache-Control: max-age=3600');
            echo wp_json_encode($manifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    /* ------------------------------------------------------------------ the rest of the WordPress site */

    /** Offer pop-up + app on ordinary (Divi) pages too */
    public static function enqueue_everywhere() {
        $s = self::settings();
        if (!$s['offers_everywhere'] && !$s['app']) return;
        $map = self::page_map();
        if (empty($map)) return;
        wp_register_script('smlc-wp-config', false, array(), self::VERSION, false);
        wp_enqueue_script('smlc-wp-config');
        $cfg = array('base' => $s['source'], 'pages' => (object) $map,
                     'sw' => $s['app'] ? home_url('/?smlc_asset=sw') : '', 'manifest' => $s['app'] ? home_url('/?smlc_asset=manifest') : '');
        wp_add_inline_script('smlc-wp-config', 'window.SMLC_WP=' . wp_json_encode($cfg) . ';' . self::link_fixer_js());
        if ($s['app']) wp_enqueue_script('smlc-app', $s['source'] . 'smlc-app.js', array('smlc-wp-config'), self::VERSION, false);
        if ($s['offers_everywhere']) wp_enqueue_script('smlc-offers', $s['source'] . 'smlc-offers.js', array('smlc-wp-config'), self::VERSION, true);
    }

    /* ------------------------------------------------------------------ settings screen */

    public static function admin_menu() {
        add_options_page('SMLC Connect', 'SMLC Connect', 'manage_options', 'smlc-connect', array(__CLASS__, 'settings_page'));
    }
    public static function register_settings() {
        register_setting('smlc_connect', self::OPT, array('sanitize_callback' => function ($in) {
            $d = SMLC_Connect::defaults();
            return array(
                'source'            => !empty($in['source']) ? trailingslashit(esc_url_raw(trim($in['source']))) : $d['source'],
                'cache_minutes'     => isset($in['cache_minutes']) ? max(1, (int) $in['cache_minutes']) : $d['cache_minutes'],
                'offers_everywhere' => empty($in['offers_everywhere']) ? 0 : 1,
                'app'               => empty($in['app']) ? 0 : 1,
                'keep_admin_bar'    => empty($in['keep_admin_bar']) ? 0 : 1,
            );
        }));
    }
    public static function settings_page() {
        if (!current_user_can('manage_options')) return;
        $s = self::settings();
        $map = self::rebuild_page_map();
        ?>
        <div class="wrap">
            <h1>SMLC Connect</h1>
            <?php if (!empty($_GET['smlc_refreshed'])) echo '<div class="notice notice-success"><p>Pages refreshed from GitHub.</p></div>'; ?>
            <h2>How to add an SMLC page</h2>
            <ol>
                <li>Pages &rarr; Add New. Give it a title and the address you want (for example <code>flora</code>).</li>
                <li>Put this in the page (a Shortcode block, or a Divi Code / Text module): <code>[smlc page="flora"]</code></li>
                <li>Publish. The page now shows the full SMLC Flora page.</li>
            </ol>
            <p>Page names: <code><?php echo esc_html(implode('</code> <code>', array_keys(self::$pages))); ?></code></p>

            <h2>SMLC pages on this site</h2>
            <table class="widefat striped" style="max-width:820px">
                <thead><tr><th>Shortcode</th><th>SMLC file</th><th>WordPress page</th></tr></thead>
                <tbody>
                <?php foreach (self::$pages as $k => $file): ?>
                    <tr><td><code>[smlc page="<?php echo esc_html($k); ?>"]</code></td><td><?php echo esc_html($file); ?></td>
                        <td><?php echo isset($map[$file]) ? '<a href="' . esc_url($map[$file]) . '" target="_blank">' . esc_html($map[$file]) . '</a>' : '<em>not added yet</em>'; ?></td></tr>
                <?php endforeach; ?>
                </tbody>
            </table>

            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin:16px 0">
                <input type="hidden" name="action" value="smlc_refresh">
                <?php wp_nonce_field('smlc_refresh'); ?>
                <?php submit_button('Refresh SMLC pages from GitHub now', 'secondary', 'submit', false); ?>
                <span class="description">Pages refresh by themselves every <?php echo (int) $s['cache_minutes']; ?> minutes.</span>
            </form>

            <h2>Settings</h2>
            <form method="post" action="options.php">
                <?php settings_fields('smlc_connect'); ?>
                <table class="form-table">
                    <tr><th scope="row"><label for="smlc-source">GitHub address</label></th>
                        <td><input id="smlc-source" class="regular-text" name="<?php echo esc_attr(self::OPT); ?>[source]" value="<?php echo esc_attr($s['source']); ?>">
                        <p class="description">Where the SMLC pages are published (GitHub Pages). Test copy: <code>https://werewolf3788.github.io/SMLC/</code></p></td></tr>
                    <tr><th scope="row"><label for="smlc-cache">Refresh every</label></th>
                        <td><input id="smlc-cache" type="number" min="1" style="width:80px" name="<?php echo esc_attr(self::OPT); ?>[cache_minutes]" value="<?php echo (int) $s['cache_minutes']; ?>"> minutes</td></tr>
                    <tr><th scope="row">Offer pop-up</th>
                        <td><label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[offers_everywhere]" value="1" <?php checked($s['offers_everywhere']); ?>> Show Premium business offers on the rest of this WordPress site too</label></td></tr>
                    <tr><th scope="row">SMLC app</th>
                        <td><label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[app]" value="1" <?php checked($s['app']); ?>> Installable app + works offline (needs https)</label></td></tr>
                    <tr><th scope="row">Admin bar</th>
                        <td><label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[keep_admin_bar]" value="1" <?php checked($s['keep_admin_bar']); ?>> Show the WordPress admin bar on SMLC pages when logged in (adds WordPress/Divi styles to those pages)</label></td></tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}
SMLC_Connect::init();

register_activation_hook(__FILE__, function () { SMLC_Connect::rebuild_page_map(); });
