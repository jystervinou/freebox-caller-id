# Freebox Caller ID

Vous en avez assez d'aller voir qui appelle sur votre téléphone Freebox *fixe*, quand la plupart du temps il s'agit d'un appel indésirable ou d'un numéro caché ?

Ce script est fait pour vous !

Quand le téléphone fixe de la Freebox (Révolution ou Mini 4K) sonne, ce script envoie une notification, au choix :

* par SMS sur votre mobile (Free Mobile) avec le numéro ou le nom de l'appelant.
* par la voix, via le haut-parleur du Freebox Server. Vous vous demandiez à quoi il servait ? Et ben voilà :-)

Vous pouvez alors décider de vous lever pour aller répondre ou pas.

## Prérequis

* Une Freebox Révolution ou une Freebox Mini 4K (le script utilise Freebox OS)
* Un serveur avec Node.js sur le réseau local de la Freebox (par exemple un Raspberry Pi)
* Une ligne Free Mobile (pour recevoir les notifications par SMS)

Vous devez récupérer votre [identifiant et la clé d'identification](http://www.universfreebox.com/article/26337/Nouveau-Free-Mobile-lance-un-systeme-de-notification-SMS-pour-vos-appareils-connectes) de l'API de notification SMS sur votre compte Free Mobile.

Vous devez lancer le script 24h/24 sur un serveur qui se trouve sur le réseau local du Freebox Server.
Le script a été testé avec un Raspberry Pi 3.

## Installation


### FFmpeg

FFmpeg sert à jouer le fichier son vers le haut-parleur du Freebox Server. (via AirTunes)

Pour le Pi3 (et le 2 ??) :

```
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-armhf-32bit-static.tar.xz
tar -xJf ffmpeg-release-armhf-32bit-static.tar.xz
sudo cp ffmpeg-3.4-armhf-32bit-static/ff* /usr/local/bin/
```

Le chemin de ffmpeg est /usr/local/bin/ffmpeg

Pour le Pi :

```
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-armel-32bit-static.tar.xz
tar -xJf ffmpeg-release-armhf-32bit-static.tar.xz
sudo cp ffmpeg-3.4-armhf-32bit-static/ff* /usr/local/bin/
```

Le chemin de ffmpeg est /usr/local/bin/ffmpeg

### Svoxpico

Svoxpico est un des meilleurs utilitaires de synthèse de voix sous linux.

```
sudo apt-get install libttspico-utils
```

### Sox

Sox est un utilitaire "couteau suisse" pour tout ce qui est manipulation de fichiers sons.

```
sudo apt-get install sox
```

### Freebox Caller ID

Le script principal qui orquestre le tout.

```
git clone https://github.com/jystervinou/freebox-caller-id.git

cd freebox-caller-id

npm install
```

Pour mettre à jour Freebox Caller ID, vous pouvez faire un `git pull` dans le répertoire freebox-caller-id.


## Fonctionnement

1- Créer un fichier config/local.json en prenant pour modèle le fichier config/default.json (Renseigner vos identifiants Free Mobile pour l'API de notification par SMS).

2- Initialiser le script pour s'authentifier auprès de la Freebox. Une demande d'autorisation va s'afficher sur l'écran LCD de Freebox Server. Répondez oui avec la flèche droite.

```
node caller_id.js init
```

3- Vous pouvez maintenant lancer le script principal :

```
node caller_id.js
```

## Carnet d'adresse de la Freebox

Freebox Caller ID utilise le carnet d'adresse de la Freebox pour trouver le nom de l'appelant.

La Freebox Révolution et la Freebox Mini 4k possèdent [un carnet d'adresse intégré pour gérer vos contacts](http://www.universfreebox.com/article/21614/Freebox-OS-journal-d-appels-gerez-vos-contacts-et-affichez-les-sur-la-Freebox).

Le plus simple est d'importer en masse vos contacts dans le carnet d'adresses.
Par exemple, vous pouvez exporter vos contacts à partir de Google Contacts. (Format vcard/vcf)

## Options

1- Vous pouvez renseigner plusieurs numéros Free Mobile destinataires des notifications. Il suffit de rajouter un nouvel élément dans l'Array 'freemobile' dans config/local.json.

```
{
  "freemobile" : [{
      "login" : "12345678",
      "pass" : "xxxxxxxxxxxxxx"
    },
    {
      "login" : "87654321",
      "pass" : "yyyyyyyyyyyyyy"
    }
  ]
}
```

2- Vous pouvez customiser le template des SMS, en rajoutant un champ 'template' (utilise [doT et sa syntaxe](http://olado.github.io/doT/index.html)):

```
{
  "freemobile" : [{
    "login" : "12345678",
    "pass" : "xxxxxxxxxxxxxx",
    "template" : "{{=call.number}}"
  }]
}
```

Les champs disponibles sont call.number, call.name, call.type, call.id, call.duration, call.datetime, call.contact_id, call.line_id, call.new ([valeurs fournies par FreeboxOS](https://dev.freebox.fr/sdk/os/call/)).

3- Pour envoyer le nom de l'appelant sur le haut-parleur du Freebox Server, il faut ajouter un champ voice2freebox dans le fichier de conf :

```
{
  "freemobile" : [{
      "login" : "12345678",
      "pass" : "xxxxxxxxxxxxxx"
    }
  ],
  "voice2freebox" : {
    "pico2wave" : "/usr/bin/pico2wave",
    "sox" : "/usr/bin/sox",
    "ffmpeg" : "/usr/local/bin/ffmpeg",
    "before" : "./starwars.wav",
    "middle" : "./r2d2.wav",
    "after" : "./theend.wav",
    "repeat" : 3
  }
}
```

Vous ne devez mettre les champs pico2wave, sox et ffmpeg seulement si vous souhaitez modifier les valeurs par défaut (qui sont celles juste au dessus).

- `repeat` est le nombre de fois que le nom sera répété via le haut-parleur. (L'integer 2, pas le string "2")
- `before` est le chemin vers un fichier wav qui sera joué avant toutes les annonces du nom.
- `middle` est le chemin vers un fichier wav qui sera joué entre les annonces du nom.
- `after` est le chemin vers un fichier wav qui sera joué après les annonces du nom.

Note : les fichiers wav doivent avoir un bitrate de 160000, vous pouvez utiliser `soxi test.wav` pour le vérifier. (soxi est installé en même temps que sox)
Pour modifier le bitrate d'un fichier wav : `sox entree.wav -r 16000 sortie.wav`

## Auteurs

* **Jean-Yves Stervinou** - *Initial work* - [Jean-Yves Stervinou](https://github.com/jystervinou)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the GPL License - see the [LICENSE.md](LICENSE.md) file for details

## Remerciements

* aeuillot et guillaumewuip pour le module Node pour Freebox OS
* les développeurs de Freebox OS

