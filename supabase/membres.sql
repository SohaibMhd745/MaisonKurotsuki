-- Les deux comptes de la Maison. À exécuter une fois, après 0001_maison.sql.
--
-- L'identifiant Discord se copie dans Discord : Paramètres > Avancés > Mode
-- développeur, puis clic droit sur le profil > « Copier l'identifiant ».
-- Tout autre compte Discord pourra se connecter mais n'aura aucun droit.

insert into public.membres (discord_id, role) values
  ('453647656992899082', 'creatrice'),
  ('638858519197777950', 'ami')
on conflict (discord_id) do update set role = excluded.role;
