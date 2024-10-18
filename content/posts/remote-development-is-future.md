---
title: "Remote development is the future of big tech"
date: 2022-02-19T09:00:00+03:00
draft: false
tags: ["Remote Development", "Big Tech", "Intellij IDEA", "VSCode"]
---
The remote development feature allows its users to have an IDE or a code editor server on a remote machine. 
All the local machine needs is a client that draws an interface, and sends, and receives data.

The industry is already pushing in this direction: VSCode was the first to introduce this feature.
It's much easier for VSCode since it's a code editor built on electron (JS), while for example, IntelliJ IDEA is an IDE and uses Java Swing library for UI.  
In Autumn 2022, JetBrains also caught this trend and announced a remote development feature for its products and a completely new IDE built from scratch that also supports this feature.
GitHub has also introduced a remote development feature which allows using VSCode in a browser.

Remote development is a fast-growing trend right now, and there are reasons for it.
I've tried it with IntelliJ IDEA and was inspired by the number of advantages remote development gives. Even though this feature is still in beta and bugs appear from time to time, it's totally worth it to try.

Let's now look at all the advantages remote development gives to software developers and companies.


## No need for powerful laptops anymore

No need to upgrade employees' laptops every 2-3 years. Cheaper alternatives, such as an iPad with a keyboard instead of a MacBook Pro, could be bought. Even Raspberry Pi could be used!   
Not only does it reduce the costs for a company but also to access an IDE from any device with a browser which is a huge advantage.

## Longer battery life for a laptop

As all computations are done on a remote machine, the laptop's CPU and RAM are not used that much.
It means that the battery life of a laptop is increased, making it possible to work for a longer time without charging.

## The same environment for every developer

Did you encounter a problem where different people were running the same code, but it only worked one of them?
It won't happen anymore! As all the code will run in the same environment, the problem will be solved.

## Cross-platform solution

Developers won't be limited in choosing preferable devices anymore.  
Software development using iPad with a keyboard? Not a problem anymore!  
A PC on Windows will become a viable option too.

## Reduction of costs by using cloud infrastructure

Big tech companies are able to use the advantages of cloud infrastructure.  
They can use the same virtual machine for multiple developers, reducing the costs of maintaining a lot of powerful laptops.

## Code is not stored on disk locally

The risk of code being stolen is reduced. 
In case of a laptop being stolen, all that has to be done is changing the password.

## Locality of data

Big tech companies might have their own docker registry or artifact repository like Artifactory.
Having your virtual machine in the same data center would mean almost instant download and upload of the libraries and docker images.

## Faster onboarding

Since everything is stored on a virtual machine, the environment for new developers can be prepared in advance to reduce onboarding time significantly.

---

It is very interesting to see how the industry is moving toward remote development.
The only disadvantage I see is the inability to work without the Internet, but the mobile internet is available almost everywhere nowadays.
Hope that you'll like the new era of remote development too!

---
### Links:  
[VSCode Remote Development](https://code.visualstudio.com/docs/remote/remote-overview/)  
[Remote Development for JetBrains products](https://www.jetbrains.com/remote-development/)  
[JetBrains Remote Development announcement post](https://blog.jetbrains.com/blog/2021/11/29/introducing-remote-development-for-jetbrains-ides/)  
[GitHub Codespaces](https://docs.github.com/en/codespaces/overview)
