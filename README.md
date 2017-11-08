# Freebox Caller ID

Vous en avez assez d'aller voir qui appelle sur votre téléphone Freebox *fixe*, quand la plupart du temps il s'agit d'un appel indésirable ou d'un numéro caché ?

Ce script est fait pour vous !

Quand le téléphone fixe de la Freebox (Révolution ou Mini 4K) sonne, ce script envoie une notification par SMS sur votre mobile (Free Mobile) avec le numéro de l'appelant.

Vous pouvez alors décider de vous lever pour aller répondre ou pas.

## Prérequis

* Une Freebox Révolution ou une Freebox Mini 4K (le script utilise Freebox OS)
* Une ligne Free Mobile (pour recevoir les notifications par SMS)
* Un serveur avec Node.js sur le réseau local de la Freebox (par exemple un Raspberry Pi)

Vous devez récupérer votre [identifiant et la clé d'identification](http://www.universfreebox.com/article/26337/Nouveau-Free-Mobile-lance-un-systeme-de-notification-SMS-pour-vos-appareils-connectes) de l'API de notification SMS sur votre compte Free Mobile.

Vous devez lancer le script 24h/24 sur un serveur qui se trouve sur le réseau local du Freebox Server.

## Installation

```
git clone https://github.com/jystervinou/freebox-caller-id.git

cd freebox-caller-id

npm install
```

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

## Auteurs

* **Jean-Yves Stervinou** - *Initial work* - [Jean-Yves Stervinou](https://github.com/jystervinou)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the GPL License - see the [LICENSE.md](LICENSE.md) file for details

## Remerciements

* aeuillot et guillaumewuip pour le module Node pour Freebox OS
* les développeurs de Freebox OS

