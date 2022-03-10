if [ "$1" = "build" ]
then
  echo "Building VON Network"
  ~/von-network/manage "build"
  echo "Building Indy Tail Server"
  ~/indy-tails-server/docker/manage "build"
fi

if [ "$1" = "stop" ]
then
  echo "Stopping VON Network"
  ~/von-network/manage "stop"
  echo "Stopping Indy Tail Server"
  ~/indy-tails-server/docker/manage "stop"
fi

if [ "$1" = "remove" ] || [ "$1" = "restart" ]
then
  echo "Removing VON Network"
  ~/von-network/manage "rm"
  echo "Removing Indy Tail Server"
  ~/indy-tails-server/docker/manage "rm"
fi

if [ "$1" = "start" ] || [ "$1" = "restart" ]
then
  echo "Starting VON Network"
  ~/von-network/manage "start"
  echo "Starting Indy Tail Server"
  ~/indy-tails-server/docker/manage "start" "--logs"
fi

if [ "$1" != "build" ] && [ "$1" != "stop" ] && [ "$1" != "start" ] && [ "$1" != "restart" ] && [ "$1" != "remove" ]
then
  echo "Usage: $0 build|start|stop|remove|restart"
fi
