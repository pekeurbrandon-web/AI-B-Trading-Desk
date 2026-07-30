:root{
    --bg-void:#050810; --panel:#0B1424; --panel-raised:#0F1D35; --panel-glass:rgba(15,29,53,0.85);
    --border:#1E3A63; --border-soft:#142544;
    --text-primary:#F5F7FA; --text-muted:#93A3BF; --text-dim:#56698C;
    --gold:#D9AE67; --gold-bright:#F0C888; --gold-dim:#5E4A26;
    --blue:#1F5FBF; --blue-deep:#034694; --blue-dim:#0A2A57;
    --bull:#42BE96; --bull-dim:#1B4438; --bear:#E06465; --bear-dim:#48211F;
    --cyan:#1F5FBF; --radius:9px; --radius-sm:6px;
    --shadow-card:0 1px 2px rgba(0,0,0,0.5), 0 8px 24px -12px rgba(3,70,148,0.35);
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg-void);color:var(--text-primary);font-family:'Inter',sans-serif;font-size:14px;-webkit-font-smoothing:antialiased;position:relative;}
  body::before{
    content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
    background-image:
      radial-gradient(1.6px 1.6px at 8% 12%, rgba(255,255,255,0.85), transparent),
      radial-gradient(1.2px 1.2px at 22% 38%, rgba(240,200,136,0.75), transparent),
      radial-gradient(1.8px 1.8px at 35% 8%, rgba(255,255,255,0.6), transparent),
      radial-gradient(1.3px 1.3px at 48% 55%, rgba(255,255,255,0.7), transparent),
      radial-gradient(1.5px 1.5px at 60% 22%, rgba(240,200,136,0.6), transparent),
      radial-gradient(1.2px 1.2px at 74% 65%, rgba(255,255,255,0.75), transparent),
      radial-gradient(1.7px 1.7px at 85% 15%, rgba(255,255,255,0.55), transparent),
      radial-gradient(1.3px 1.3px at 92% 48%, rgba(240,200,136,0.7), transparent),
      radial-gradient(1.4px 1.4px at 15% 78%, rgba(255,255,255,0.6), transparent),
      radial-gradient(1.6px 1.6px at 68% 88%, rgba(255,255,255,0.7), transparent),
      radial-gradient(1.2px 1.2px at 40% 92%, rgba(240,200,136,0.55), transparent),
      radial-gradient(1.5px 1.5px at 5% 55%, rgba(255,255,255,0.5), transparent);
    background-repeat:repeat;background-size:480px 480px;
    animation:twinkle 7s ease-in-out infinite alternate;
  }
  @keyframes twinkle{from{opacity:0.4;}to{opacity:0.85;}}
  @media (prefers-reduced-motion: reduce){ body::before{animation:none;opacity:0.6;} }
  .app{display:flex;min-height:100vh;position:relative;z-index:1;}
  ::selection{background:var(--gold-dim);color:var(--text-primary);}
  svg.icon{width:16px;height:16px;flex-shrink:0;}

  .sidebar{width:206px;flex-shrink:0;background:linear-gradient(180deg,var(--panel),#040910);border-right:1px solid var(--border);padding:22px 0;display:flex;flex-direction:column;position:fixed;height:100vh;overflow-y:auto;z-index:40;}
  .brand{padding:0 22px 20px;border-bottom:1px solid var(--border);margin-bottom:14px;}
  .brand-title{font-family:'Anton',sans-serif;font-weight:400;font-size:19px;letter-spacing:0.03em;text-transform:uppercase;background:linear-gradient(135deg,var(--gold-bright),var(--gold) 55%,var(--blue));-webkit-background-clip:text;background-clip:text;color:transparent;}
  .brand-sub{font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:var(--text-dim);letter-spacing:0.12em;margin-top:3px;}
  .nav{display:flex;flex-direction:column;gap:2px;padding:0 11px;}
  .nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--radius-sm);cursor:pointer;color:var(--text-muted);font-family:'Oswald',sans-serif;font-size:13px;font-weight:500;letter-spacing:0.01em;border-left:2px solid transparent;transition:background .12s,color .12s;}
  .nav-item:hover{background:var(--panel-raised);color:var(--text-primary);}
  .nav-item.active{background:var(--panel-raised);color:var(--gold-bright);border-left:2px solid var(--blue);}
  .sidebar-foot{margin-top:auto;padding:16px 22px 0;border-top:1px solid var(--border);}
  .sidebar-foot p{font-size:10px;color:var(--text-dim);line-height:1.6;margin:12px 0 0;font-style:italic;}
  .mobile-nav{display:none;}

  .main{flex:1;min-width:0;padding:28px 36px 70px;max-width:1200px;margin-left:206px;}
  .page{display:none;} .page.active{display:block;animation:fadein .15s ease;}
  @keyframes fadein{from{opacity:0;}to{opacity:1;}}
  .page-head{margin-bottom:22px;}
  .page-title{font-family:'Anton',sans-serif;font-weight:400;font-size:27px;margin:0 0 4px;letter-spacing:0.01em;text-transform:uppercase;color:var(--text-primary);}
  .page-desc{color:var(--text-muted);font-size:13px;margin:0;line-height:1.5;max-width:640px;}

  .card{background:var(--panel);border:1px solid var(--border);border-top:1px solid var(--gold-dim);border-radius:var(--radius);padding:19px 21px;box-shadow:var(--shadow-card);}
  .card + .card{margin-top:14px;}
  .card-title{font-family:'Oswald',sans-serif;font-size:12.5px;font-weight:600;margin:0 0 13px;letter-spacing:0.06em;text-transform:uppercase;color:var(--gold-bright);display:flex;justify-content:space-between;align-items:center;}
  .grid{display:grid;gap:14px;}
  .grid-3{grid-template-columns:repeat(3,1fr);} .grid-2{grid-template-columns:repeat(2,1fr);}
  @media (max-width:820px){.grid-3,.grid-2{grid-template-columns:1fr;}}

  .stat-box{background:var(--panel-raised);border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:14px 16px;}
  .stat-label{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;}
  .stat-value{font-family:'IBM Plex Mono',monospace;font-size:21px;font-weight:600;font-variant-numeric:tabular-nums;}
  .stat-value.bull{color:var(--bull);} .stat-value.bear{color:var(--bear);} .stat-value.gold{color:var(--gold-bright);}
  .stat-value.small{font-size:15px;}

  label{display:block;font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:500;}
  input,select,textarea{width:100%;background:var(--bg-void);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius-sm);padding:9px 10px;font-family:'IBM Plex Mono',monospace;font-size:13px;}
  textarea{font-family:'Inter',sans-serif;resize:vertical;min-height:56px;}
  input:focus,select:focus,textarea:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px rgba(31,95,191,0.18);}
  .field{margin-bottom:12px;}
  .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .field-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
  @media (max-width:600px){.field-row,.field-row3{grid-template-columns:1fr;}}

  button{font-family:'Oswald',sans-serif;font-weight:500;letter-spacing:0.02em;font-size:13px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-raised);color:var(--text-primary);padding:10px 16px;cursor:pointer;transition:filter .12s,transform .06s;}
  button:hover{filter:brightness(1.18);} button:active{transform:scale(0.98);}
  button.primary{background:linear-gradient(135deg,var(--gold-bright),var(--gold));border-color:var(--gold);color:#1A1305;font-weight:700;}
  button.ghost{background:transparent;} button:disabled{opacity:0.45;cursor:not-allowed;}
  button.small{padding:6px 11px;font-size:12px;} button.danger{color:var(--bear);}

  .ring{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .ring-inner{width:44px;height:44px;border-radius:50%;background:var(--panel);display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:13px;}
  .ring.sm{width:38px;height:38px;} .ring.sm .ring-inner{width:30px;height:30px;font-size:11px;}

  .upload-zone{border:1.5px dashed var(--border);border-radius:var(--radius);padding:26px 16px;text-align:center;cursor:pointer;transition:border-color .12s;}
  .upload-zone:hover,.upload-zone.drag{border-color:var(--gold-dim);background:rgba(217,174,103,0.03);}
  .upload-zone p{color:var(--text-muted);font-size:12.5px;margin:6px 0 0;}
  .preview-img{max-width:100%;max-height:200px;border-radius:var(--radius-sm);border:1px solid var(--border);display:block;margin:0 auto;}

  .tag{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.05em;}
  .tag.bull{background:var(--bull-dim);color:var(--bull);} .tag.bear{background:var(--bear-dim);color:var(--bear);}
  .tag.neutral{background:var(--panel-raised);color:var(--text-muted);border:1px solid var(--border);}
  .tag.grade-A{background:var(--gold-dim);color:var(--gold-bright);} .tag.grade-B{background:var(--panel-raised);color:var(--cyan);border:1px solid var(--border);}
  .tag.grade-C{background:var(--panel-raised);color:var(--text-dim);border:1px solid var(--border);}

  .level-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border-soft);font-size:12.5px;gap:10px;}
  .level-row:last-child{border-bottom:none;}
  .level-type{color:var(--text-muted);text-transform:uppercase;font-size:9.5px;letter-spacing:0.06em;}
  .level-price{font-family:'IBM Plex Mono',monospace;text-align:right;}

  .disclaimer{font-size:11px;color:var(--text-dim);background:var(--panel-raised);border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:10px 12px;line-height:1.55;}
  .error-banner{font-size:12px;color:var(--bear);background:var(--bear-dim);border:1px solid var(--bear);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:10px;}

  .journal-card,.pattern-card{background:var(--panel-raised);border:1px solid var(--border-soft);border-radius:var(--radius);padding:14px 16px;margin-bottom:10px;}
  .journal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
  .journal-symbol{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:14px;}
  .journal-meta{font-size:10.5px;color:var(--text-dim);margin-top:2px;}
  .empty-state{text-align:center;padding:36px 20px;color:var(--text-dim);}
  .empty-state .big{font-size:24px;margin-bottom:8px;opacity:0.5;}

  .outcome-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
  .pill{font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid var(--border);cursor:pointer;color:var(--text-muted);}
  .pill.active.win{background:var(--bull-dim);color:var(--bull);border-color:var(--bull);}
  .pill.active.loss{background:var(--bear-dim);color:var(--bear);border-color:var(--bear);}
  .pill.active.be{background:var(--panel);color:var(--text-primary);border-color:var(--text-muted);}
  .pill.active.open{background:var(--gold-dim);color:var(--gold-bright);border-color:var(--gold);}

  .spinner{width:15px;height:15px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px;}
  @keyframes spin{to{transform:rotate(360deg);}}

  .section-block{margin-bottom:16px;} .section-block:last-child{margin-bottom:0;}
  .section-label{font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;font-weight:600;}
  .section-text{font-size:13px;line-height:1.6;}
  .not-readable-banner{background:var(--bear-dim);border:1px solid var(--bear);color:var(--bear);border-radius:var(--radius-sm);padding:12px 14px;font-size:12.5px;line-height:1.5;}
  .council-row{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border-soft);font-size:12px;}
  .council-row:last-child{border-bottom:none;}
  .council-persona{color:var(--cyan);font-weight:600;min-width:130px;flex-shrink:0;}
  .suggested-size{background:var(--panel);border:1px solid var(--gold-dim);border-radius:var(--radius-sm);padding:12px 14px;margin-top:10px;font-size:12.5px;}
  .scanner-row,.match-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-soft);}
  .scanner-row:last-child,.match-row:last-child{border-bottom:none;}
  .badge-num{width:22px;height:22px;border-radius:5px;background:var(--panel);display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text-dim);flex-shrink:0;}

  /* Franky Lamps overlay */
  .fl-toggle{position:fixed;bottom:22px;right:22px;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #1a2233, #0c0e12);border:1.5px solid #2C5FBF;box-shadow:0 6px 20px rgba(31,95,191,0.4);cursor:pointer;z-index:80;display:flex;align-items:center;justify-content:center;}
  .fl-toggle:hover{filter:brightness(1.08);}
  .fl-panel{position:fixed;bottom:96px;right:22px;width:340px;max-height:min(500px,70vh);background:var(--panel-glass);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:12px;box-shadow:0 20px 50px -12px rgba(0,0,0,0.6);z-index:79;display:none;flex-direction:column;overflow:hidden;}
  .fl-panel.open{display:flex;}
  .fl-head{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;}
  .fl-head-title{font-family:'Oswald',sans-serif;font-weight:600;letter-spacing:0.02em;font-size:14px;color:var(--gold-bright);}
  .fl-head-sub{font-size:9.5px;color:var(--text-dim);margin-top:1px;}
  .fl-close{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:2px 6px;}
  .fl-messages{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;}
  .fl-msg{font-size:12.5px;line-height:1.5;padding:8px 11px;border-radius:10px;max-width:88%;}
  .fl-msg.user{background:var(--panel-raised);align-self:flex-end;border:1px solid var(--border);}
  .fl-msg.assistant{background:rgba(217,174,103,0.08);align-self:flex-start;border:1px solid var(--gold-dim);}
  .fl-input-row{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border);}
  .fl-input-row input{margin:0;}
  @media (max-width:480px){.fl-panel{right:10px;left:10px;width:auto;bottom:80px;}}

  @media (max-width:820px){
    .sidebar{display:none;}
    .main{margin-left:0;padding:16px 16px 90px;}
    .mobile-nav{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--border);z-index:60;overflow-x:auto;}
    .mobile-nav-item{flex:1;text-align:center;padding:9px 4px;font-family:'Oswald',sans-serif;font-size:9.5px;letter-spacing:0.02em;color:var(--text-muted);cursor:pointer;white-space:nowrap;}
    .mobile-nav-item.active{color:var(--gold-bright);}
    .fl-toggle{bottom:66px;}
    .fl-panel{bottom:128px;}
  }