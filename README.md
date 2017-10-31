# Freebox Caller ID

Quand le téléphone fixe de la Freebox Révolution sonne, ce script envoie une notification par SMS (Free Mobile) avec le numéro de l'appelant

### Prérequis

Vous devez lancer le script 24/24 sur un serveur qui se trouve sur le réseau local du Freebox Server.

Vous devez récupérer votre [identifiant et la clé d'identification](http://www.universfreebox.com/article/26337/Nouveau-Free-Mobile-lance-un-systeme-de-notification-SMS-pour-vos-appareils-connectes) de l'API de notification SMS sur votre compte Free Mobile.

### Installation

```
npm install freebox-caller-id

cd freebox-caller-id

npm install
```

## Fonctionnement

1- Ouvrez le fichier config.json pour renseigner vos identifiants Free Mobile pour l'API de notification par SMS. 

2- Initialiser le script pour s'authentifier auprès de la Freebox. Une demande d'autorisation va s'afficher sur l'écran LCD de Freebox Server. Répondez oui avec la flèche droite.

```
node caller_id.js init
```

3- Vous pouvez maintenant lancer le script principal :

```
node caller_id.js
```

## Auteurs

* **Jean-Yves Stervinou** - *Initial work* - [Jean-Yves Stervinou](https://github.com/jystervinou)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the GPL License - see the [LICENSE.md](LICENSE.md) file for details

## Remerciements

* aeuillot et guillaumewuip pour le module Node pour Freebox OS
* les développeurs de Freebox OS

