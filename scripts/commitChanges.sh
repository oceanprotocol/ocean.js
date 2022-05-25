# Check if the file has been changed
# Input file
FILE=CodeExamples.md
# Timeframe for the comparison
OLDTIME=60
# Get current and file times
CURTIME=$(date +%s)
FILETIME=$(stat $FILE -c %Y)
TIMEDIFF=$(expr $CURTIME - $FILETIME)

# Check if file older
if [ $TIMEDIFF -gt $OLDTIME ]; then
    echo "CodeExamples.md file has not been changed"
else
    echo "CodeExamples.md file has been changed. Committing changes"
    # Stage the file, commit and push
    git status
    git add CodeExamples.md
    git commit -m "Updating CodeExamples.md"
    branch=${GITHUB_HEAD_REF#refs/heads/}
    echo Pushing changes to branch: ${branch}
    git push origin HEAD:${branch} --force
fi